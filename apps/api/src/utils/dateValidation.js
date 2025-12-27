/**
 * 📅 Date Validation Utility
 * FASE B2: Utilitário para validação de datas
 * Valida formato, lógica de negócio e períodos
 */

/**
 * Valida formato de data (YYYY-MM-DD)
 * @param {string} date - Data no formato YYYY-MM-DD
 * @returns {Object} { valid: boolean, error?: string }
 */
function validateDateFormat(date) {
  if (!date || typeof date !== 'string') {
    return {
      valid: false,
      error: 'Data deve ser uma string no formato YYYY-MM-DD',
    };
  }

  // Regex para formato YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return {
      valid: false,
      error: 'Data deve estar no formato YYYY-MM-DD (ex: 2025-07-15)',
    };
  }

  // Verificar se é uma data válida
  const dateObj = new Date(date + 'T00:00:00.000Z');
  if (isNaN(dateObj.getTime())) {
    return {
      valid: false,
      error: 'Data inválida',
    };
  }

  // Verificar se a data parseada corresponde à string original
  const [year, month, day] = date.split('-').map(Number);
  if (
    dateObj.getUTCFullYear() !== year ||
    dateObj.getUTCMonth() + 1 !== month ||
    dateObj.getUTCDate() !== day
  ) {
    return {
      valid: false,
      error: 'Data inválida (ex: 2025-13-45)',
    };
  }

  return { valid: true };
}

/**
 * Valida lógica de datas de check-in e check-out
 * @param {string} checkIn - Data de check-in (YYYY-MM-DD)
 * @param {string} checkOut - Data de check-out (YYYY-MM-DD)
 * @param {Object} options - Opções de validação
 * @param {boolean} options.allowPast - Permitir datas no passado (padrão: false)
 * @param {number} options.minStayDays - Número mínimo de dias de estadia (padrão: 1)
 * @param {number} options.maxStayDays - Número máximo de dias de estadia (padrão: null)
 * @returns {Object} { valid: boolean, error?: string }
 */
function validateDateLogic(checkIn, checkOut, options = {}) {
  const {
    allowPast = false,
    minStayDays = 1,
    maxStayDays = null,
  } = options;

  // Validar formato primeiro
  const checkInFormat = validateDateFormat(checkIn);
  if (!checkInFormat.valid) {
    return {
      valid: false,
      error: `Check-in inválido: ${checkInFormat.error}`,
    };
  }

  const checkOutFormat = validateDateFormat(checkOut);
  if (!checkOutFormat.valid) {
    return {
      valid: false,
      error: `Check-out inválido: ${checkOutFormat.error}`,
    };
  }

  // Converter para objetos Date
  const checkInDate = new Date(checkIn + 'T00:00:00.000Z');
  const checkOutDate = new Date(checkOut + 'T00:00:00.000Z');
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Verificar se check-out é depois de check-in
  if (checkOutDate <= checkInDate) {
    return {
      valid: false,
      error: 'Check-out deve ser posterior ao check-in',
    };
  }

  // Verificar se datas não estão no passado (se não permitido)
  if (!allowPast) {
    if (checkInDate < today) {
      return {
        valid: false,
        error: 'Check-in não pode ser no passado',
      };
    }
    if (checkOutDate < today) {
      return {
        valid: false,
        error: 'Check-out não pode ser no passado',
      };
    }
  }

  // Calcular número de dias
  const diffTime = checkOutDate - checkInDate;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Verificar período mínimo
  if (diffDays < minStayDays) {
    return {
      valid: false,
      error: `Período mínimo de estadia é de ${minStayDays} dia(s)`,
    };
  }

  // Verificar período máximo
  if (maxStayDays !== null && diffDays > maxStayDays) {
    return {
      valid: false,
      error: `Período máximo de estadia é de ${maxStayDays} dia(s)`,
    };
  }

  return { valid: true, days: diffDays };
}

/**
 * Verifica se uma data está no passado
 * @param {string} date - Data no formato YYYY-MM-DD
 * @returns {boolean}
 */
function isDateInPast(date) {
  const dateFormat = validateDateFormat(date);
  if (!dateFormat.valid) {
    return false;
  }

  const dateObj = new Date(date + 'T00:00:00.000Z');
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  return dateObj < today;
}

/**
 * Calcula número de dias entre duas datas
 * @param {string} checkIn - Data de check-in (YYYY-MM-DD)
 * @param {string} checkOut - Data de check-out (YYYY-MM-DD)
 * @returns {number} Número de dias
 */
function calculateDaysBetween(checkIn, checkOut) {
  const checkInDate = new Date(checkIn + 'T00:00:00.000Z');
  const checkOutDate = new Date(checkOut + 'T00:00:00.000Z');
  const diffTime = checkOutDate - checkInDate;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

module.exports = {
  validateDateFormat,
  validateDateLogic,
  isDateInPast,
  calculateDaysBetween,
};

