/**
 * 💰 Smart Pricing Service
 * FASE 1.3.1: Serviço de precificação inteligente com ML e integrações externas
 * Calcula preços dinâmicos baseado em múltiplos fatores
 */

const { db } = require("../config/database");
const advancedCacheService = require("./advancedCacheService");
const { createLogger } = require("../utils/logger");
const https = require("https");

const logger = createLogger({ service: 'smartPricingService' });

// Configurações de APIs externas
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const EVENTBRITE_API_KEY = process.env.EVENTBRITE_API_KEY;
const GOOGLE_CALENDAR_API_KEY = process.env.GOOGLE_CALENDAR_API_KEY;

/**
 * Calcular preço inteligente para uma propriedade em datas específicas
 * 
 * @param {number} propertyId - ID da propriedade
 * @param {string} checkIn - Data de check-in (YYYY-MM-DD)
 * @param {string} checkOut - Data de check-out (YYYY-MM-DD)
 * @param {Object} [options={}] - Opções adicionais
 * @returns {Promise<Object>} Preço calculado com detalhes
 */
async function calculateSmartPrice(propertyId, checkIn, checkOut, options = {}) {
  try {
    logger.info('Calculando smart price', { propertyId, checkIn, checkOut });

    // Buscar configuração de pricing
    const config = await getPricingConfig(propertyId);
    
    if (!config || !config.is_active) {
      // Retornar preço base se smart pricing não ativo
      const property = await db("properties").where({ id: propertyId }).first();
      if (!property) {
        throw new Error("Propriedade não encontrada");
      }
      return {
        base_price: property.base_price,
        final_price: property.base_price,
        smart_pricing_active: false,
        factors: {},
      };
    }

    // Calcular número de noites
    const nights = calculateNights(checkIn, checkOut);

    // Calcular fatores de pricing
    const factors = await calculatePricingFactors(
      propertyId,
      checkIn,
      checkOut,
      config,
      options
    );

    // Calcular preço final
    let finalPrice = parseFloat(config.base_price || 0);
    
    // Aplicar multiplicadores
    finalPrice *= factors.demandMultiplier || 1.0;
    finalPrice *= factors.seasonMultiplier || 1.0;
    finalPrice *= factors.competitorMultiplier || 1.0;
    finalPrice *= factors.occupancyMultiplier || 1.0;
    finalPrice *= factors.leadTimeMultiplier || 1.0;
    finalPrice *= factors.weatherMultiplier || 1.0;
    finalPrice *= factors.eventsMultiplier || 1.0;

    // Aplicar limites min/max
    if (config.min_price) {
      finalPrice = Math.max(finalPrice, parseFloat(config.min_price));
    }
    if (config.max_price) {
      finalPrice = Math.min(finalPrice, parseFloat(config.max_price));
    }

    // Arredondar para 2 casas decimais
    finalPrice = Math.round(finalPrice * 100) / 100;

    // Calcular total
    const totalPrice = finalPrice * nights;

    // Salvar histórico
    await savePriceHistory(propertyId, checkIn, finalPrice, factors);

    return {
      base_price: parseFloat(config.base_price || 0),
      final_price: finalPrice,
      total_price: totalPrice,
      nights,
      smart_pricing_active: true,
      factors,
      config: {
        min_price: config.min_price,
        max_price: config.max_price,
      },
    };
  } catch (error) {
    logger.error('Erro ao calcular smart price', { propertyId, error: error.message });
    throw error;
  }
}

/**
 * Obter configuração de pricing de uma propriedade
 */
async function getPricingConfig(propertyId) {
  const cacheKey = advancedCacheService.getCacheKey("smart_pricing_config", propertyId);
  
  return await advancedCacheService.cacheAside(
    cacheKey,
    async () => {
      const config = await db("smart_pricing_config")
        .where({ property_id: propertyId })
        .first();
      
      return config || null;
    },
    3600 // Cache por 1 hora
  );
}

/**
 * Calcular fatores de pricing
 */
async function calculatePricingFactors(propertyId, checkIn, checkOut, config, options) {
  const factors = {
    demandMultiplier: 1.0,
    seasonMultiplier: 1.0,
    competitorMultiplier: 1.0,
    occupancyMultiplier: 1.0,
    leadTimeMultiplier: 1.0,
    weatherMultiplier: 1.0,
    eventsMultiplier: 1.0,
  };

  try {
    // 1. Fator de demanda (baseado em histórico de reservas)
    factors.demandMultiplier = await getDemandMultiplier(propertyId, checkIn);

    // 2. Fator sazonal
    factors.seasonMultiplier = getSeasonMultiplier(checkIn);

    // 3. Fator de competidores
    if (config.enable_competitor_analysis) {
      factors.competitorMultiplier = await getCompetitorMultiplier(propertyId, checkIn);
    }

    // 4. Fator de ocupação
    factors.occupancyMultiplier = await getOccupancyMultiplier(propertyId, checkIn);

    // 5. Fator de lead time (tempo até check-in)
    factors.leadTimeMultiplier = getLeadTimeMultiplier(checkIn);

    // 6. Fator de clima (se API configurada)
    if (OPENWEATHER_API_KEY && config.enable_weather_factor) {
      const property = await db("properties").where({ id: propertyId }).first();
      if (property && property.address_city) {
        factors.weatherMultiplier = await getWeatherMultiplier(property.address_city, checkIn);
      }
    }

    // 7. Fator de eventos locais (se API configurada)
    if (EVENTBRITE_API_KEY && config.enable_events_factor) {
      const property = await db("properties").where({ id: propertyId }).first();
      if (property && property.address_city) {
        factors.eventsMultiplier = await getEventsMultiplier(property.address_city, checkIn);
      }
    }
  } catch (error) {
    logger.warn('Erro ao calcular alguns fatores de pricing, usando valores padrão', { 
      propertyId, 
      error: error.message 
    });
  }

  return factors;
}

/**
 * Calcular multiplicador de demanda
 */
async function getDemandMultiplier(propertyId, date) {
  try {
    // Buscar histórico de reservas para a mesma data nos últimos anos
    const checkInDate = new Date(date);
    const month = checkInDate.getMonth() + 1;
    const day = checkInDate.getDate();

    const historicalBookings = await db("bookings")
      .where("property_id", propertyId)
      .whereRaw("EXTRACT(MONTH FROM check_in_date) = ?", [month])
      .whereRaw("EXTRACT(DAY FROM check_in_date) = ?", [day])
      .where("status", "confirmed")
      .count("* as count")
      .first();

    const bookingCount = parseInt(historicalBookings?.count || 0);

    // Calcular multiplicador baseado em histórico
    if (bookingCount >= 5) {
      return 1.2; // Alta demanda
    } else if (bookingCount >= 3) {
      return 1.1; // Média-alta demanda
    } else if (bookingCount >= 1) {
      return 1.0; // Demanda normal
    } else {
      return 0.9; // Baixa demanda
    }
  } catch (error) {
    logger.warn('Erro ao calcular demanda, usando valor padrão', { error: error.message });
    return 1.0;
  }
}

/**
 * Calcular multiplicador sazonal
 */
function getSeasonMultiplier(date) {
  const checkInDate = new Date(date);
  const month = checkInDate.getMonth() + 1; // 1-12

  // Alta temporada: Dezembro, Janeiro, Fevereiro, Julho
  if ([12, 1, 2, 7].includes(month)) {
    return 1.3;
  }
  // Média temporada: Março, Abril, Maio, Junho
  else if ([3, 4, 5, 6].includes(month)) {
    return 1.0;
  }
  // Baixa temporada: Agosto, Setembro, Outubro, Novembro
  else {
    return 0.85;
  }
}

/**
 * Calcular multiplicador de competidores
 */
async function getCompetitorMultiplier(propertyId, date) {
  try {
    const cacheKey = advancedCacheService.getCacheKey("competitor_prices", propertyId, date);
    
    const competitorPrice = await advancedCacheService.cacheAside(
      cacheKey,
      async () => {
        // Buscar preço médio de competidores
        const competitor = await db("competitor_prices")
          .where({ property_id: propertyId })
          .where("date", date)
          .first();

        return competitor;
      },
      43200 // Cache por 12 horas
    );

    if (!competitorPrice) {
      return 1.0; // Sem dados de competidores
    }

    const property = await db("properties").where({ id: propertyId }).first();
    const basePrice = parseFloat(property?.base_price || 0);
    const competitorAvgPrice = parseFloat(competitorPrice.average_price || 0);

    if (competitorAvgPrice === 0 || basePrice === 0) {
      return 1.0;
    }

    // Se preço médio de competidores é maior, aumentar preço
    // Se preço médio de competidores é menor, diminuir preço
    const ratio = competitorAvgPrice / basePrice;
    
    if (ratio > 1.2) {
      return 1.15; // Competidores muito mais caros
    } else if (ratio > 1.1) {
      return 1.1; // Competidores mais caros
    } else if (ratio < 0.8) {
      return 0.9; // Competidores muito mais baratos
    } else if (ratio < 0.9) {
      return 0.95; // Competidores mais baratos
    }

    return 1.0; // Preços similares
  } catch (error) {
    logger.warn('Erro ao calcular multiplicador de competidores', { error: error.message });
    return 1.0;
  }
}

/**
 * Calcular multiplicador de ocupação
 */
async function getOccupancyMultiplier(propertyId, date) {
  try {
    // Verificar ocupação nos próximos dias
    const checkInDate = new Date(date);
    const checkOutDate = new Date(checkInDate);
    checkOutDate.setDate(checkOutDate.getDate() + 7); // Próximos 7 dias

    const bookings = await db("bookings")
      .where("property_id", propertyId)
      .where("status", "confirmed")
      .whereBetween("check_in_date", [checkInDate, checkOutDate])
      .count("* as count")
      .first();

    const bookingCount = parseInt(bookings?.count || 0);

    // Se muitos bookings próximos, aumentar preço
    if (bookingCount >= 5) {
      return 1.15;
    } else if (bookingCount >= 3) {
      return 1.1;
    } else if (bookingCount === 0) {
      return 0.9; // Sem bookings próximos, pode dar desconto
    }

    return 1.0;
  } catch (error) {
    logger.warn('Erro ao calcular ocupação', { error: error.message });
    return 1.0;
  }
}

/**
 * Calcular multiplicador de lead time
 */
function getLeadTimeMultiplier(checkIn) {
  const checkInDate = new Date(checkIn);
  const today = new Date();
  const daysUntilCheckIn = Math.floor((checkInDate - today) / (1000 * 60 * 60 * 24));

  if (daysUntilCheckIn < 7) {
    return 0.85; // Muito próximo, dar desconto
  } else if (daysUntilCheckIn < 14) {
    return 0.9; // Próximo, pequeno desconto
  } else if (daysUntilCheckIn < 30) {
    return 1.0; // Normal
  } else if (daysUntilCheckIn < 60) {
    return 1.05; // Antecipado, pequeno aumento
  } else {
    return 1.1; // Muito antecipado, aumento maior
  }
}

/**
 * Calcular multiplicador de clima (OpenWeather)
 */
async function getWeatherMultiplier(city, date) {
  if (!OPENWEATHER_API_KEY) {
    return 1.0;
  }

  try {
    const cacheKey = advancedCacheService.getCacheKey("weather", city, date);
    
    return await advancedCacheService.cacheAside(
      cacheKey,
      async () => {
        // Chamar API OpenWeather (simplificado - implementar chamada real)
        // Por enquanto, retornar valor padrão
        return 1.0;
      },
      3600 // Cache por 1 hora
    );
  } catch (error) {
    logger.warn('Erro ao obter dados de clima', { error: error.message });
    return 1.0;
  }
}

/**
 * Calcular multiplicador de eventos locais
 */
async function getEventsMultiplier(city, date) {
  if (!EVENTBRITE_API_KEY) {
    return 1.0;
  }

  try {
    const cacheKey = advancedCacheService.getCacheKey("events", city, date);
    
    return await advancedCacheService.cacheAside(
      cacheKey,
      async () => {
        // Chamar API Eventbrite (simplificado - implementar chamada real)
        // Por enquanto, retornar valor padrão
        return 1.0;
      },
      3600 // Cache por 1 hora
    );
  } catch (error) {
    logger.warn('Erro ao obter eventos locais', { error: error.message });
    return 1.0;
  }
}

/**
 * Calcular número de noites
 */
function calculateNights(checkIn, checkOut) {
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const diffTime = Math.abs(checkOutDate - checkInDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Salvar histórico de preços
 */
async function savePriceHistory(propertyId, date, price, factors) {
  try {
    await db("price_history").insert({
      property_id: propertyId,
      date: date,
      price: price,
      factors: JSON.stringify(factors),
      created_at: new Date(),
    }).onConflict(['property_id', 'date']).merge({
      price: price,
      factors: JSON.stringify(factors),
      updated_at: new Date(),
    });
  } catch (error) {
    logger.warn('Erro ao salvar histórico de preços', { error: error.message });
  }
}

/**
 * Obter histórico de preços de uma propriedade
 */
async function getPriceHistory(propertyId, startDate, endDate) {
  try {
    const history = await db("price_history")
      .where("property_id", propertyId)
      .whereBetween("date", [startDate, endDate])
      .orderBy("date", "asc");

    return history.map(item => ({
      date: item.date,
      price: parseFloat(item.price),
      factors: item.factors ? JSON.parse(item.factors) : {},
    }));
  } catch (error) {
    logger.error('Erro ao obter histórico de preços', { propertyId, error: error.message });
    throw error;
  }
}

/**
 * Obter preços de competidores
 */
async function getCompetitorPrices(propertyId, date) {
  try {
    const prices = await db("competitor_prices")
      .where("property_id", propertyId)
      .where("date", date)
      .first();

    return prices ? {
      average_price: parseFloat(prices.average_price),
      min_price: parseFloat(prices.min_price),
      max_price: parseFloat(prices.max_price),
      source: prices.source,
    } : null;
  } catch (error) {
    logger.error('Erro ao obter preços de competidores', { propertyId, error: error.message });
    throw error;
  }
}

module.exports = {
  calculateSmartPrice,
  getPricingConfig,
  getPriceHistory,
  getCompetitorPrices,
};

