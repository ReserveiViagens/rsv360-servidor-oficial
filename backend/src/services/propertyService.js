/**
 * 🏠 Property Service
 * FASE 1: Serviço de propriedades com cache e validação
 * Gerencia CRUD de propriedades, busca e disponibilidade
 */

const { db, withTransaction } = require("../config/database");
const availabilityService = require("./availabilityService");
const advancedCacheService = require("./advancedCacheService");
const { createLogger } = require("../utils/logger");

const logger = createLogger({ service: 'propertyService' });

/**
 * Obter propriedade por ID com cache
 * 
 * @param {number} id - ID da propriedade
 * @param {boolean} [includeOwner=true] - Incluir dados do proprietário (nome e email)
 * @returns {Promise<Object|null>} Propriedade com amenities e images parseados, ou null se não encontrada
 * 
 * @example
 * const property = await propertyService.getPropertyById(1);
 * // Retorna: { id: 1, title: 'Casa na Praia', amenities: ['wifi', 'pool'], images: [...], ... }
 * 
 * @throws {Error} Quando ocorre erro ao acessar banco de dados
 * 
 * @since FASE 1
 */
async function getPropertyById(id, includeOwner = true) {
  try {
    const cacheKey = advancedCacheService.getCacheKey("property", id);
    
    const property = await advancedCacheService.cacheAside(
      cacheKey,
      async () => {
        let query = db("properties");
        
        if (includeOwner) {
          query = query
            .leftJoin("owners", "properties.owner_id", "owners.id")
            .select(
              "properties.*",
              "owners.name as owner_name",
              "owners.email as owner_email",
            );
        } else {
          query = query.select("properties.*");
        }
        
        const result = await query
          .where("properties.id", parseInt(id))
          .first();
        
        if (!result) {
          return null;
        }
        
        return {
          ...result,
          amenities: JSON.parse(result.amenities || "[]"),
          images: JSON.parse(result.images || "[]"),
        };
      },
      3600, // Cache por 1 hora
    );
    
    return property;
  } catch (error) {
    logger.error('Erro ao obter propriedade', { id, error: error.message });
    throw error;
  }
}

/**
 * Buscar propriedades com filtros e paginação
 * 
 * Suporta filtros avançados e verificação de disponibilidade em batch quando check_in/check_out são fornecidos.
 * Cache inteligente: 5 minutos com verificação de disponibilidade, 30 minutos sem.
 * 
 * @param {Object} [filters={}] - Filtros de busca
 * @param {string} [filters.type] - Tipo de propriedade (apartment, house, chalet, flat, bungalow, villa, condo)
 * @param {string} [filters.city] - Cidade (busca parcial case-insensitive)
 * @param {number} [filters.min_price] - Preço mínimo
 * @param {number} [filters.max_price] - Preço máximo
 * @param {number} [filters.bedrooms] - Número mínimo de quartos
 * @param {string} [filters.check_in] - Data de check-in (YYYY-MM-DD) - ativa verificação de disponibilidade
 * @param {string} [filters.check_out] - Data de check-out (YYYY-MM-DD) - ativa verificação de disponibilidade
 * @param {number} [filters.page=1] - Página (inicia em 1)
 * @param {number} [filters.limit=20] - Limite por página
 * @returns {Promise<Object>} Objeto com propriedades e paginação
 * @returns {Promise<Array>} returns.properties - Lista de propriedades encontradas
 * @returns {Promise<Object>} returns.pagination - Informações de paginação
 * @returns {Promise<number>} returns.pagination.page - Página atual
 * @returns {Promise<number>} returns.pagination.limit - Limite por página
 * @returns {Promise<number>} returns.pagination.total - Total de registros
 * @returns {Promise<number>} returns.pagination.totalPages - Total de páginas
 * 
 * @example
 * // Busca simples
 * const result = await propertyService.searchProperties({ city: 'São Paulo', page: 1, limit: 20 });
 * 
 * // Busca com disponibilidade
 * const result = await propertyService.searchProperties({
 *   city: 'Rio de Janeiro',
 *   check_in: '2025-02-01',
 *   check_out: '2025-02-05',
 *   min_price: 100,
 *   max_price: 500
 * });
 * 
 * @throws {Error} Quando ocorre erro ao acessar banco de dados ou verificar disponibilidade
 * 
 * @since FASE 1
 */
async function searchProperties(filters = {}) {
  try {
    const {
      type,
      city,
      min_price,
      max_price,
      bedrooms,
      check_in,
      check_out,
      page = 1,
      limit = 20,
    } = filters;
    
    // Cache key incluindo check_in e check_out se fornecidos
    const availabilityKey = check_in && check_out ? `${check_in}-${check_out}` : 'no-dates';
    const cacheKey = advancedCacheService.getCacheKey(
      "properties",
      "list",
      `${type || "all"}-${city || "all"}-${min_price || "0"}-${max_price || "999999"}-${availabilityKey}-${page}-${limit}`,
    );
    
    // Tentar buscar do cache
    const properties = await advancedCacheService.cacheAside(
      cacheKey,
      async () => {
        let query = db("properties").where("status", "active");
        
        if (type) {
          query = query.where("type", type);
        }
        if (city) {
          query = query.where("address_city", "ilike", `%${city}%`);
        }
        if (min_price) {
          query = query.where("base_price", ">=", parseFloat(min_price));
        }
        if (max_price) {
          query = query.where("base_price", "<=", parseFloat(max_price));
        }
        if (bedrooms) {
          query = query.where("bedrooms", ">=", parseInt(bedrooms));
        }
        
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const results = await query
          .limit(parseInt(limit))
          .offset(offset)
          .orderBy("created_at", "desc");
        
        // Parse JSON fields
        const parsedResults = results.map((prop) => ({
          ...prop,
          amenities: JSON.parse(prop.amenities || "[]"),
          images: JSON.parse(prop.images || "[]"),
        }));
        
        // Verificar disponibilidade em batch se check_in e check_out fornecidos
        if (check_in && check_out) {
          const availabilityChecks = await Promise.all(
            parsedResults.map(async (prop) => {
              try {
                const availability = await availabilityService.checkAvailability(
                  prop.id,
                  check_in,
                  check_out,
                );
                return {
                  propertyId: prop.id,
                  available: availability.available,
                };
              } catch (error) {
                // Se erro na verificação, assumir disponível (não bloquear listagem)
                logger.warn('Erro ao verificar disponibilidade', { 
                  propertyId: prop.id, 
                  error: error.message 
                });
                return {
                  propertyId: prop.id,
                  available: true, // Assumir disponível em caso de erro
                };
              }
            }),
          );
          
          // Filtrar apenas properties disponíveis
          const availablePropertyIds = availabilityChecks
            .filter((check) => check.available)
            .map((check) => check.propertyId);
          
          return parsedResults.filter((prop) => availablePropertyIds.includes(prop.id));
        }
        
        return parsedResults;
      },
      check_in && check_out ? 300 : 1800, // Cache menor se verificação de disponibilidade (5 min vs 30 min)
    );
    
    // Total de registros
    let totalQuery = db("properties").where("status", "active");
    if (type) totalQuery = totalQuery.where("type", type);
    if (city) totalQuery = totalQuery.where("address_city", "ilike", `%${city}%`);
    if (min_price) totalQuery = totalQuery.where("base_price", ">=", parseFloat(min_price));
    if (max_price) totalQuery = totalQuery.where("base_price", "<=", parseFloat(max_price));
    if (bedrooms) totalQuery = totalQuery.where("bedrooms", ">=", parseInt(bedrooms));
    
    const total = await totalQuery.count("* as count").first();
    
    return {
      properties,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total.count),
        totalPages: Math.ceil(total.count / parseInt(limit)),
      },
    };
  } catch (error) {
    logger.error('Erro ao buscar propriedades', { filters, error: error.message });
    throw error;
  }
}

/**
 * Criar nova propriedade
 * 
 * Cria uma nova propriedade com status "pending" (aguardando aprovação).
 * Invalida automaticamente o cache de propriedades.
 * 
 * @param {Object} propertyData - Dados da propriedade
 * @param {number} [propertyData.owner_id] - ID do proprietário (opcional)
 * @param {string} propertyData.type - Tipo de propriedade (apartment, house, chalet, flat, bungalow, villa, condo)
 * @param {string} propertyData.title - Título da propriedade
 * @param {string} [propertyData.description] - Descrição detalhada
 * @param {string} propertyData.address_street - Rua e número
 * @param {string} propertyData.address_city - Cidade
 * @param {string} propertyData.address_state - Estado (sigla)
 * @param {string} [propertyData.address_zip_code] - CEP
 * @param {string} [propertyData.address_country='Brasil'] - País
 * @param {number} [propertyData.latitude] - Latitude (GPS)
 * @param {number} [propertyData.longitude] - Longitude (GPS)
 * @param {number} [propertyData.bedrooms] - Número de quartos
 * @param {number} [propertyData.bathrooms] - Número de banheiros
 * @param {number} propertyData.max_guests - Número máximo de hóspedes (obrigatório)
 * @param {number} [propertyData.area_sqm] - Área em metros quadrados
 * @param {number} propertyData.base_price - Preço base por noite (obrigatório)
 * @param {number} [propertyData.cleaning_fee=0] - Taxa de limpeza
 * @param {Array<string>} [propertyData.amenities=[]] - Lista de amenidades (ex: ['wifi', 'pool', 'parking'])
 * @param {Array<string>} [propertyData.images=[]] - URLs das imagens
 * @param {number} [propertyData.min_stay=1] - Estadia mínima em noites
 * @param {string} [propertyData.check_in_time='14:00'] - Horário de check-in (HH:mm)
 * @param {string} [propertyData.check_out_time='11:00'] - Horário de check-out (HH:mm)
 * @param {string} [propertyData.cancellation_policy] - Política de cancelamento
 * @returns {Promise<Object>} Propriedade criada com amenities e images parseados
 * 
 * @example
 * const property = await propertyService.createProperty({
 *   type: 'apartment',
 *   title: 'Apartamento no Centro',
 *   address_street: 'Rua das Flores, 123',
 *   address_city: 'São Paulo',
 *   address_state: 'SP',
 *   max_guests: 4,
 *   base_price: 200,
 *   amenities: ['wifi', 'pool'],
 *   images: ['https://example.com/image1.jpg']
 * });
 * 
 * @throws {Error} Quando ocorre erro ao inserir no banco de dados
 * 
 * @since FASE 1
 */
async function createProperty(propertyData) {
  try {
    const property = {
      owner_id: propertyData.owner_id || null,
      type: propertyData.type,
      title: propertyData.title,
      description: propertyData.description || null,
      address_street: propertyData.address_street,
      address_city: propertyData.address_city,
      address_state: propertyData.address_state,
      address_zip_code: propertyData.address_zip_code || null,
      address_country: propertyData.address_country,
      latitude: propertyData.latitude || null,
      longitude: propertyData.longitude || null,
      bedrooms: propertyData.bedrooms || null,
      bathrooms: propertyData.bathrooms || null,
      max_guests: propertyData.max_guests,
      area_sqm: propertyData.area_sqm || null,
      base_price: propertyData.base_price,
      cleaning_fee: propertyData.cleaning_fee || 0,
      amenities: JSON.stringify(propertyData.amenities || []),
      images: JSON.stringify(propertyData.images || []),
      min_stay: propertyData.min_stay || 1,
      check_in_time: propertyData.check_in_time || "14:00",
      check_out_time: propertyData.check_out_time || "11:00",
      cancellation_policy: propertyData.cancellation_policy || null,
      status: "pending", // Aguardando aprovação
    };
    
    const [newProperty] = await db("properties").insert(property).returning("*");
    
    // Limpar cache
    await advancedCacheService.invalidateCache("property:*");
    await advancedCacheService.invalidateCache("properties:list:*");
    
    logger.info('Propriedade criada', { propertyId: newProperty.id });
    
    return {
      ...newProperty,
      amenities: JSON.parse(newProperty.amenities || "[]"),
      images: JSON.parse(newProperty.images || "[]"),
    };
  } catch (error) {
    logger.error('Erro ao criar propriedade', { propertyData, error: error.message });
    throw error;
  }
}

/**
 * Atualizar propriedade
 * 
 * Atualiza apenas campos permitidos. Campos não permitidos são ignorados.
 * Invalida automaticamente o cache da propriedade e da lista.
 * 
 * Campos permitidos: title, description, base_price, cleaning_fee, amenities, status, min_stay, check_in_time, check_out_time, cancellation_policy
 * 
 * @param {number} id - ID da propriedade
 * @param {Object} updates - Campos para atualizar
 * @param {string} [updates.title] - Novo título
 * @param {string} [updates.description] - Nova descrição
 * @param {number} [updates.base_price] - Novo preço base
 * @param {number} [updates.cleaning_fee] - Nova taxa de limpeza
 * @param {Array<string>} [updates.amenities] - Nova lista de amenidades
 * @param {string} [updates.status] - Novo status (active, inactive, pending, deleted)
 * @param {number} [updates.min_stay] - Nova estadia mínima
 * @param {string} [updates.check_in_time] - Novo horário de check-in
 * @param {string} [updates.check_out_time] - Novo horário de check-out
 * @param {string} [updates.cancellation_policy] - Nova política de cancelamento
 * @returns {Promise<Object>} Propriedade atualizada com amenities e images parseados
 * 
 * @example
 * const updated = await propertyService.updateProperty(1, {
 *   base_price: 250,
 *   amenities: ['wifi', 'pool', 'parking']
 * });
 * 
 * @throws {Error} Quando nenhum campo válido é fornecido ou ocorre erro no banco
 * 
 * @since FASE 1
 */
async function updateProperty(id, updates) {
  try {
    // Campos permitidos para atualização
    const allowedFields = [
      "title",
      "description",
      "base_price",
      "cleaning_fee",
      "amenities",
      "status",
      "min_stay",
      "check_in_time",
      "check_out_time",
      "cancellation_policy",
    ];
    
    const filteredUpdates = {};
    Object.keys(updates).forEach((key) => {
      if (allowedFields.includes(key)) {
        if (key === "amenities" && Array.isArray(updates[key])) {
          filteredUpdates[key] = JSON.stringify(updates[key]);
        } else {
          filteredUpdates[key] = updates[key];
        }
      }
    });
    
    if (Object.keys(filteredUpdates).length === 0) {
      throw new Error("Nenhum campo válido para atualizar");
    }
    
    filteredUpdates.updated_at = new Date();
    
    await db("properties").where("id", parseInt(id)).update(filteredUpdates);
    
    const property = await db("properties").where("id", parseInt(id)).first();
    
    // Limpar cache
    await advancedCacheService.invalidateCache(`property:${id}*`);
    await advancedCacheService.invalidateCache("properties:list:*");
    
    logger.info('Propriedade atualizada', { propertyId: id });
    
    return {
      ...property,
      amenities: JSON.parse(property.amenities || "[]"),
      images: JSON.parse(property.images || "[]"),
    };
  } catch (error) {
    logger.error('Erro ao atualizar propriedade', { id, updates, error: error.message });
    throw error;
  }
}

/**
 * Deletar propriedade (soft delete)
 * 
 * Faz soft delete alterando o status para "deleted" ao invés de remover do banco.
 * Invalida automaticamente o cache da propriedade e da lista.
 * 
 * @param {number} id - ID da propriedade
 * @returns {Promise<boolean>} True se deletado com sucesso
 * 
 * @example
 * await propertyService.deleteProperty(1);
 * // Propriedade agora tem status = 'deleted'
 * 
 * @throws {Error} Quando ocorre erro ao atualizar no banco de dados
 * 
 * @since FASE 1
 */
async function deleteProperty(id) {
  try {
    await db("properties")
      .where("id", parseInt(id))
      .update({
        status: "deleted",
        updated_at: new Date(),
      });
    
    // Limpar cache
    await advancedCacheService.invalidateCache(`property:${id}*`);
    await advancedCacheService.invalidateCache("properties:list:*");
    
    logger.info('Propriedade deletada', { propertyId: id });
    
    return true;
  } catch (error) {
    logger.error('Erro ao deletar propriedade', { id, error: error.message });
    throw error;
  }
}

/**
 * Obter calendário de disponibilidade
 * 
 * Retorna a disponibilidade de uma propriedade para um mês específico.
 * Se ano e mês não forem fornecidos, usa o ano e mês atual.
 * 
 * @param {number} id - ID da propriedade
 * @param {number} [year] - Ano (padrão: ano atual)
 * @param {number} [month] - Mês de 1 a 12 (padrão: mês atual)
 * @returns {Promise<Object>} Calendário de disponibilidade
 * @returns {Promise<number>} returns.property_id - ID da propriedade
 * @returns {Promise<number>} returns.year - Ano consultado
 * @returns {Promise<number>} returns.month - Mês consultado
 * @returns {Promise<Array>} returns.availability - Array de disponibilidade por data
 * @returns {Promise<string>} returns.availability[].date - Data (YYYY-MM-DD)
 * @returns {Promise<boolean>} returns.availability[].available - Se está disponível
 * @returns {Promise<number>} returns.availability[].price - Preço para a data
 * @returns {Promise<number>} returns.availability[].min_stay - Estadia mínima
 * 
 * @example
 * const calendar = await propertyService.getPropertyCalendar(1, 2025, 2);
 * // Retorna disponibilidade de fevereiro de 2025
 * 
 * @throws {Error} Quando ocorre erro ao acessar banco de dados
 * 
 * @since FASE 1
 */
async function getPropertyCalendar(id, year, month) {
  try {
    const propertyId = parseInt(id);
    const targetYear = year || new Date().getFullYear();
    const targetMonth = month || new Date().getMonth() + 1;
    
    // Buscar disponibilidade do mês
    const availability = await db("property_availability")
      .where("property_id", propertyId)
      .whereRaw("EXTRACT(YEAR FROM date) = ?", [targetYear])
      .whereRaw("EXTRACT(MONTH FROM date) = ?", [targetMonth])
      .orderBy("date", "asc");
    
    return {
      property_id: propertyId,
      year: targetYear,
      month: targetMonth,
      availability: availability.map((a) => ({
        date: a.date,
        available: a.available,
        price: a.price,
        min_stay: a.min_stay,
      })),
    };
  } catch (error) {
    logger.error('Erro ao obter calendário', { id, year, month, error: error.message });
    throw error;
  }
}

/**
 * Verificar disponibilidade de propriedade
 * 
 * Wrapper para availabilityService.checkAvailability.
 * Verifica se uma propriedade está disponível para um período específico.
 * 
 * @param {number} id - ID da propriedade
 * @param {string} checkIn - Data de check-in (YYYY-MM-DD)
 * @param {string} checkOut - Data de check-out (YYYY-MM-DD)
 * @returns {Promise<Object>} Resultado da verificação
 * @returns {Promise<boolean>} returns.available - Se está disponível
 * @returns {Promise<number>} returns.price - Preço total do período
 * @returns {Promise<number>} returns.nights - Número de noites
 * 
 * @example
 * const availability = await propertyService.checkPropertyAvailability(1, '2025-02-01', '2025-02-05');
 * if (availability.available) {
 *   console.log(`Disponível por R$ ${availability.price} por ${availability.nights} noites`);
 * }
 * 
 * @throws {Error} Quando ocorre erro ao verificar disponibilidade
 * 
 * @since FASE 1
 */
async function checkPropertyAvailability(id, checkIn, checkOut) {
  try {
    return await availabilityService.checkAvailability(id, checkIn, checkOut);
  } catch (error) {
    logger.error('Erro ao verificar disponibilidade', { id, checkIn, checkOut, error: error.message });
    throw error;
  }
}

module.exports = {
  getPropertyById,
  searchProperties,
  createProperty,
  updateProperty,
  deleteProperty,
  getPropertyCalendar,
  checkPropertyAvailability,
};

