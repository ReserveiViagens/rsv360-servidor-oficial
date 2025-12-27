/**
 * 📅 Booking Service
 * FASE 2.2: Serviço de reservas com optimistic locking
 * Previne race conditions e double-bookings
 */

const { db, withTransaction } = require("../config/database");
const availabilityService = require("./availabilityService");
const { validateDateFormat, validateDateLogic } = require("../utils/dateValidation");
// FASE C2.1: Logger centralizado
const { createLogger } = require("../utils/logger");

const MAX_RETRIES = 3;

// FASE C2.3: Métricas de transação
const transactionMetrics = {
  attempts: 0,
  successes: 0,
  failures: 0,
  totalTime: 0,
  versionConflicts: 0,
  availabilityConflicts: 0,
};

// Logger com contexto do serviço
const logger = createLogger({ service: 'bookingService' });

/**
 * Criar reserva com optimistic locking e verificação de disponibilidade
 * @param {Object} bookingData - Dados da reserva
 * @param {number} bookingData.property_id - ID da propriedade
 * @param {number} bookingData.customer_id - ID do cliente
 * @param {string} bookingData.check_in - Data de check-in (YYYY-MM-DD)
 * @param {string} bookingData.check_out - Data de check-out (YYYY-MM-DD)
 * @param {number} bookingData.guests_count - Número de hóspedes
 * @param {number} bookingData.user_id - ID do usuário
 * @param {Object} bookingData.metadata - Metadados adicionais
 * @returns {Promise<Object>} Reserva criada
 */
async function createBookingWithLocking(bookingData) {
  // FASE B2.3: Validar datas antes de processar
  const dateFormatValidation = validateDateFormat(bookingData.check_in);
  if (!dateFormatValidation.valid) {
    throw new Error(`Check-in inválido: ${dateFormatValidation.error}`);
  }

  const checkOutFormatValidation = validateDateFormat(bookingData.check_out);
  if (!checkOutFormatValidation.valid) {
    throw new Error(`Check-out inválido: ${checkOutFormatValidation.error}`);
  }

  const dateLogicValidation = validateDateLogic(bookingData.check_in, bookingData.check_out, {
    allowPast: false, // Não permitir datas no passado
    minStayDays: 1, // Mínimo 1 dia
  });

  if (!dateLogicValidation.valid) {
    throw new Error(dateLogicValidation.error);
  }

  // FASE C2.2 e C2.3: Logging e métricas de transação
  const startTime = Date.now();
  const transactionLogger = logger.withContext({
    operation: 'createBookingWithLocking',
    property_id: bookingData.property_id,
    customer_id: bookingData.customer_id,
    check_in: bookingData.check_in,
    check_out: bookingData.check_out,
  });

  transactionLogger.info('Iniciando criação de reserva com optimistic locking');
  transactionMetrics.attempts++;

  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      transactionLogger.debug(`Tentativa ${attempt + 1}/${MAX_RETRIES} de criar reserva`);

      // Verificar disponibilidade primeiro (com cache Redis)
      // Nota: availabilityService.checkAvailability já valida datas também
      const availabilityStartTime = Date.now();
      const availability = await availabilityService.checkAvailability(
        bookingData.property_id,
        bookingData.check_in,
        bookingData.check_out,
      );
      const availabilityTime = Date.now() - availabilityStartTime;

      transactionLogger.debug(`Verificação de disponibilidade concluída em ${availabilityTime}ms`, {
        available: availability.available,
        conflictingBookings: availability.conflictingBookings,
      });

      if (!availability.available) {
        transactionMetrics.availabilityConflicts++;
        transactionLogger.warn('Propriedade não disponível', {
          conflictingBookings: availability.conflictingBookings,
          conflictingBookingIds: availability.conflictingBookingIds,
        });
        throw new Error(
          `Propriedade não disponível. Conflitos: ${availability.conflictingBookings}`,
        );
      }

      // Verificar se período está bloqueado
      const blockStatus = await availabilityService.isPeriodBlocked(
        bookingData.property_id,
        bookingData.check_in,
        bookingData.check_out,
      );

      if (blockStatus.blocked && blockStatus.bookingId !== bookingData.temp_booking_id) {
        throw new Error("Período temporariamente bloqueado por outra reserva");
      }

      // Criar reserva dentro de transação com lock pessimista
      const transactionStartTime = Date.now();
      return await withTransaction(async (trx) => {
        transactionLogger.debug('Iniciando transação de criação de reserva');

        // Verificar conflitos com lock (FOR UPDATE)
        const conflictCheckStartTime = Date.now();
        const conflictingBookings = await trx("bookings")
          .where("property_id", bookingData.property_id)
          .whereIn("status", ["pending", "confirmed", "in_progress"])
          .where(function () {
            this.whereBetween("check_in", [bookingData.check_in, bookingData.check_out])
              .orWhereBetween("check_out", [bookingData.check_in, bookingData.check_out])
              .orWhere(function () {
                this.where("check_in", "<=", bookingData.check_in).where(
                  "check_out",
                  ">=",
                  bookingData.check_out,
                );
              });
          })
          .forUpdate(); // Lock pessimista na transação

        const conflictCheckTime = Date.now() - conflictCheckStartTime;
        transactionLogger.debug(`Verificação de conflitos concluída em ${conflictCheckTime}ms`, {
          conflictsFound: conflictingBookings.length,
        });

        if (conflictingBookings.length > 0) {
          transactionMetrics.availabilityConflicts++;
          transactionLogger.warn('Conflito detectado durante transação', {
            conflictingBookingIds: conflictingBookings.map(b => b.id),
          });
          throw new Error("BOOKING_CONFLICT");
        }

        // Gerar número de reserva único
        const bookingNumber = `RSV${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

        // Calcular valores
        const property = await trx("properties").where("id", bookingData.property_id).first();
        if (!property) {
          throw new Error("Propriedade não encontrada");
        }

        const checkInDate = new Date(bookingData.check_in);
        const checkOutDate = new Date(bookingData.check_out);
        const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));

        const basePrice = parseFloat(property.base_price || 0) * nights;
        const cleaningFee = parseFloat(property.cleaning_fee || 0);
        const serviceFee = basePrice * 0.1; // 10% taxa de serviço
        const totalAmount = basePrice + cleaningFee + serviceFee;

        // Criar reserva com version = 1
        const [booking] = await trx("bookings")
          .insert({
            booking_number: bookingNumber,
            user_id: bookingData.user_id,
            property_id: bookingData.property_id,
            customer_id: bookingData.customer_id,
            check_in: bookingData.check_in,
            check_out: bookingData.check_out,
            guests_count: bookingData.guests_count || 1,
            base_price: basePrice,
            cleaning_fee: cleaningFee,
            service_fee: serviceFee,
            total_amount: totalAmount,
            status: "pending",
            payment_status: "pending",
            version: 1, // Versão inicial
            special_requests: bookingData.special_requests || null,
            metadata: bookingData.metadata ? JSON.stringify(bookingData.metadata) : null,
          })
          .returning("*");

        // Limpar cache de disponibilidade
        await availabilityService.clearAvailabilityCache(bookingData.property_id);

        const transactionTime = Date.now() - transactionStartTime;
        const totalTime = Date.now() - startTime;

        transactionMetrics.successes++;
        transactionMetrics.totalTime += totalTime;

        transactionLogger.info('Reserva criada com sucesso', {
          booking_id: booking.id,
          booking_number: booking.booking_number,
          transaction_time_ms: transactionTime,
          total_time_ms: totalTime,
          attempts: attempt + 1,
        });

        return booking;
      });
    } catch (error) {
      attempt++;
      const totalTime = Date.now() - startTime;

      if (error.message === "BOOKING_CONFLICT") {
        transactionLogger.warn('Conflito de reserva detectado', {
          attempt: attempt,
          total_time_ms: totalTime,
        });
        throw new Error("Propriedade não disponível para as datas selecionadas");
      }

      transactionLogger.error('Erro ao criar reserva', {
        attempt: attempt,
        error: error.message,
        stack: error.stack,
        total_time_ms: totalTime,
      });

      if (attempt >= MAX_RETRIES) {
        transactionMetrics.failures++;
        transactionLogger.error('Falha ao criar reserva após todas as tentativas', {
          attempts: MAX_RETRIES,
          total_time_ms: totalTime,
          final_error: error.message,
        });
        throw new Error(`Falha ao criar reserva após ${MAX_RETRIES} tentativas: ${error.message}`);
      }

      // Exponential backoff
      const delay = Math.pow(2, attempt) * 100;
      transactionLogger.debug(`Aguardando ${delay}ms antes da próxima tentativa (exponential backoff)`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

/**
 * Atualizar reserva com verificação de version (optimistic locking)
 * @param {number} bookingId - ID da reserva
 * @param {Object} updates - Campos para atualizar
 * @param {number} currentVersion - Versão atual esperada
 * @returns {Promise<Object>} Reserva atualizada
 */
async function updateBookingWithVersionCheck(bookingId, updates, currentVersion) {
  // FASE C2.2 e C2.3: Logging e métricas de transação
  const startTime = Date.now();
  const transactionLogger = logger.withContext({
    operation: 'updateBookingWithVersionCheck',
    booking_id: bookingId,
    current_version: currentVersion,
  });

  transactionLogger.info('Iniciando atualização de reserva com verificação de versão');
  transactionMetrics.attempts++;

  // FASE B2.3: Validar datas se estiverem sendo atualizadas
  if (updates.check_in || updates.check_out) {
    const checkIn = updates.check_in || null;
    const checkOut = updates.check_out || null;

    // Se ambos estão sendo atualizados, validar lógica
    if (checkIn && checkOut) {
      const dateFormatValidation = validateDateFormat(checkIn);
      if (!dateFormatValidation.valid) {
        throw new Error(`Check-in inválido: ${dateFormatValidation.error}`);
      }

      const checkOutFormatValidation = validateDateFormat(checkOut);
      if (!checkOutFormatValidation.valid) {
        throw new Error(`Check-out inválido: ${checkOutFormatValidation.error}`);
      }

      const dateLogicValidation = validateDateLogic(checkIn, checkOut, {
        allowPast: false, // Não permitir datas no passado
        minStayDays: 1, // Mínimo 1 dia
      });

      if (!dateLogicValidation.valid) {
        throw new Error(dateLogicValidation.error);
      }
    } else if (checkIn) {
      // Apenas check-in sendo atualizado - validar formato
      const dateFormatValidation = validateDateFormat(checkIn);
      if (!dateFormatValidation.valid) {
        throw new Error(`Check-in inválido: ${dateFormatValidation.error}`);
      }
    } else if (checkOut) {
      // Apenas check-out sendo atualizado - validar formato
      const checkOutFormatValidation = validateDateFormat(checkOut);
      if (!checkOutFormatValidation.valid) {
        throw new Error(`Check-out inválido: ${checkOutFormatValidation.error}`);
      }
    }
  }

  return await withTransaction(async (trx) => {
    // Buscar reserva com lock e verificar version
    const booking = await trx("bookings")
      .where("id", bookingId)
      .where("version", currentVersion)
      .first()
      .forUpdate(); // Lock pessimista

    if (!booking) {
      // Verificar se existe mas com version diferente
      const existing = await trx("bookings").where("id", bookingId).first();
      if (existing) {
        transactionMetrics.versionConflicts++;
        transactionLogger.warn('Conflito de versão detectado', {
          expected_version: currentVersion,
          actual_version: existing.version,
        });
        throw new Error(
          `BOOKING_MODIFIED: Reserva foi modificada por outro usuário. Versão atual: ${existing.version}, esperada: ${currentVersion}`,
        );
      }
      transactionLogger.error('Reserva não encontrada', { booking_id: bookingId });
      throw new Error("Reserva não encontrada");
    }

    // Se apenas um dos campos de data foi atualizado, validar com o outro existente
    if (updates.check_in && !updates.check_out) {
      const dateLogicValidation = validateDateLogic(updates.check_in, booking.check_out, {
        allowPast: false,
        minStayDays: 1,
      });
      if (!dateLogicValidation.valid) {
        throw new Error(dateLogicValidation.error);
      }
    } else if (updates.check_out && !updates.check_in) {
      const dateLogicValidation = validateDateLogic(booking.check_in, updates.check_out, {
        allowPast: false,
        minStayDays: 1,
      });
      if (!dateLogicValidation.valid) {
        throw new Error(dateLogicValidation.error);
      }
    }

    // Atualizar com incremento de version
    const [updatedBooking] = await trx("bookings")
      .where("id", bookingId)
      .where("version", currentVersion)
      .update({
        ...updates,
        version: currentVersion + 1,
        updated_at: new Date(),
      })
      .returning("*");

    if (!updatedBooking) {
      throw new Error("Falha ao atualizar reserva");
    }

    // Limpar cache se propriedade mudou
    if (updates.property_id || updates.check_in || updates.check_out) {
      await availabilityService.clearAvailabilityCache(booking.property_id);
      if (updates.property_id && updates.property_id !== booking.property_id) {
        await availabilityService.clearAvailabilityCache(updates.property_id);
      }
      transactionLogger.debug('Cache de disponibilidade limpo', {
        old_property_id: booking.property_id,
        new_property_id: updates.property_id,
      });
    }

    const totalTime = Date.now() - startTime;
    transactionMetrics.successes++;
    transactionMetrics.totalTime += totalTime;

    transactionLogger.info('Reserva atualizada com sucesso', {
      booking_id: updatedBooking.id,
      new_version: updatedBooking.version,
      total_time_ms: totalTime,
    });

    return updatedBooking;
  });
}

/**
 * Cancelar reserva com verificação de version
 * @param {number} bookingId - ID da reserva
 * @param {number} currentVersion - Versão atual
 * @param {string} reason - Motivo do cancelamento
 * @returns {Promise<Object>} Reserva cancelada
 */
async function cancelBookingWithVersionCheck(bookingId, currentVersion, reason = null) {
  return await updateBookingWithVersionCheck(
    bookingId,
    {
      status: "cancelled",
      cancellation_reason: reason,
      cancelled_at: new Date(),
    },
    currentVersion,
  );
}

/**
 * Confirmar reserva com verificação de version
 * @param {number} bookingId - ID da reserva
 * @param {number} currentVersion - Versão atual
 * @returns {Promise<Object>} Reserva confirmada
 */
async function confirmBookingWithVersionCheck(bookingId, currentVersion) {
  return await updateBookingWithVersionCheck(
    bookingId,
    {
      status: "confirmed",
      confirmed_at: new Date(),
    },
    currentVersion,
  );
}

/**
 * Obter reserva com version atual
 * @param {number} bookingId - ID da reserva
 * @returns {Promise<Object>} Reserva com version
 */
async function getBookingWithVersion(bookingId) {
  const booking = await db("bookings")
    .select(
      "bookings.*",
      "properties.title as property_title",
      "properties.address_city",
      "customers.name as customer_name",
      "customers.email as customer_email",
    )
    .leftJoin("properties", "bookings.property_id", "properties.id")
    .leftJoin("customers", "bookings.customer_id", "customers.id")
    .where("bookings.id", bookingId)
    .first();

  if (!booking) {
    throw new Error("Reserva não encontrada");
  }

  return booking;
}

/**
 * Obter métricas de transação
 * FASE C2.3: Métricas de transação
 * @returns {Object} Métricas de transação
 */
function getTransactionMetrics() {
  const total = transactionMetrics.attempts;
  const successRate = total > 0
    ? ((transactionMetrics.successes / total) * 100).toFixed(2)
    : 0;
  const avgTime = total > 0
    ? (transactionMetrics.totalTime / total).toFixed(2)
    : 0;

  return {
    attempts: transactionMetrics.attempts,
    successes: transactionMetrics.successes,
    failures: transactionMetrics.failures,
    successRate: `${successRate}%`,
    averageTimeMs: parseFloat(avgTime),
    totalTimeMs: transactionMetrics.totalTime,
    versionConflicts: transactionMetrics.versionConflicts,
    availabilityConflicts: transactionMetrics.availabilityConflicts,
  };
}

/**
 * Resetar métricas de transação
 * FASE C2.3: Reset de métricas
 */
function resetTransactionMetrics() {
  transactionMetrics.attempts = 0;
  transactionMetrics.successes = 0;
  transactionMetrics.failures = 0;
  transactionMetrics.totalTime = 0;
  transactionMetrics.versionConflicts = 0;
  transactionMetrics.availabilityConflicts = 0;
  logger.info('Métricas de transação resetadas');
}

module.exports = {
  createBookingWithLocking,
  updateBookingWithVersionCheck,
  cancelBookingWithVersionCheck,
  confirmBookingWithVersionCheck,
  getBookingWithVersion,
  getTransactionMetrics, // FASE C2.3
  resetTransactionMetrics, // FASE C2.3
};

