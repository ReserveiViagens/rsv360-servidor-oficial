/**
 * 🔍 Competitor Scraper Service
 * FASE 1.3.6: Serviço de scraping de preços de competidores
 * Coleta preços médios de Airbnb e Booking.com
 */

const { db } = require("../config/database");
const advancedCacheService = require("./advancedCacheService");
const { createLogger } = require("../utils/logger");
const https = require("https");

const logger = createLogger({ service: 'competitorScraperService' });

// Configurações
const SCRAPER_ENABLED = process.env.COMPETITOR_SCRAPER_ENABLED === 'true';
const CACHE_TTL = 43200; // 12 horas

/**
 * Coletar preços de competidores para uma propriedade
 * 
 * @param {number} propertyId - ID da propriedade
 * @param {string} date - Data (YYYY-MM-DD)
 * @returns {Promise<Object>} Preços coletados
 */
async function scrapeCompetitorPrices(propertyId, date) {
  try {
    if (!SCRAPER_ENABLED) {
      logger.info('Scraper desabilitado, retornando dados mockados');
      return getMockCompetitorPrices(propertyId, date);
    }

    const cacheKey = advancedCacheService.getCacheKey("competitor_prices", propertyId, date);
    
    return await advancedCacheService.cacheAside(
      cacheKey,
      async () => {
        const property = await db("properties")
          .where("id", propertyId)
          .first();

        if (!property) {
          throw new Error("Propriedade não encontrada");
        }

        const city = property.address_city;
        const basePrice = parseFloat(property.base_price || 0);

        // Coletar preços de diferentes fontes
        const airbnbPrice = await scrapeAirbnbPrice(city, date, basePrice);
        const bookingPrice = await scrapeBookingPrice(city, date, basePrice);

        // Calcular média
        const prices = [airbnbPrice, bookingPrice].filter(p => p !== null);
        const averagePrice = prices.length > 0
          ? prices.reduce((sum, p) => sum + p, 0) / prices.length
          : basePrice;

        // Salvar no banco
        await db("competitor_prices").insert({
          property_id: propertyId,
          date: date,
          average_price: averagePrice,
          min_price: Math.min(...prices),
          max_price: Math.max(...prices),
          source: 'scraper',
          created_at: new Date(),
        }).onConflict(['property_id', 'date']).merge({
          average_price: averagePrice,
          min_price: Math.min(...prices),
          max_price: Math.max(...prices),
          updated_at: new Date(),
        });

        return {
          property_id: propertyId,
          date,
          average_price: averagePrice,
          min_price: Math.min(...prices),
          max_price: Math.max(...prices),
          sources: {
            airbnb: airbnbPrice,
            booking: bookingPrice,
          },
        };
      },
      CACHE_TTL
    );
  } catch (error) {
    logger.error('Erro ao coletar preços de competidores', { propertyId, date, error: error.message });
    // Retornar dados mockados em caso de erro
    return getMockCompetitorPrices(propertyId, date);
  }
}

/**
 * Scraping de preços do Airbnb (simplificado - implementar scraping real)
 */
async function scrapeAirbnbPrice(city, date, basePrice) {
  try {
    // TODO: Implementar scraping real do Airbnb
    // Por enquanto, retornar preço baseado em variação aleatória
    const variation = 0.9 + Math.random() * 0.2; // 90% a 110% do preço base
    return Math.round(basePrice * variation * 100) / 100;
  } catch (error) {
    logger.warn('Erro ao fazer scraping do Airbnb', { error: error.message });
    return null;
  }
}

/**
 * Scraping de preços do Booking.com (simplificado - implementar scraping real)
 */
async function scrapeBookingPrice(city, date, basePrice) {
  try {
    // TODO: Implementar scraping real do Booking.com
    // Por enquanto, retornar preço baseado em variação aleatória
    const variation = 0.85 + Math.random() * 0.3; // 85% a 115% do preço base
    return Math.round(basePrice * variation * 100) / 100;
  } catch (error) {
    logger.warn('Erro ao fazer scraping do Booking.com', { error: error.message });
    return null;
  }
}

/**
 * Obter preços mockados (para desenvolvimento)
 */
async function getMockCompetitorPrices(propertyId, date) {
  const property = await db("properties")
    .where("id", propertyId)
    .first();

  if (!property) {
    throw new Error("Propriedade não encontrada");
  }

  const basePrice = parseFloat(property.base_price || 0);
  const variation = 0.9 + Math.random() * 0.2; // 90% a 110%
  const averagePrice = Math.round(basePrice * variation * 100) / 100;

  return {
    property_id: propertyId,
    date,
    average_price: averagePrice,
    min_price: Math.round(averagePrice * 0.9 * 100) / 100,
    max_price: Math.round(averagePrice * 1.1 * 100) / 100,
    sources: {
      airbnb: Math.round(averagePrice * (0.95 + Math.random() * 0.1) * 100) / 100,
      booking: Math.round(averagePrice * (0.9 + Math.random() * 0.15) * 100) / 100,
    },
    mock: true,
  };
}

/**
 * Coletar preços em batch para múltiplas propriedades
 */
async function scrapeCompetitorPricesBatch(propertyIds, date) {
  try {
    const results = await Promise.all(
      propertyIds.map(async (propertyId) => {
        try {
          return await scrapeCompetitorPrices(propertyId, date);
        } catch (error) {
          logger.warn('Erro ao coletar preços para propriedade', { propertyId, error: error.message });
          return null;
        }
      })
    );

    return results.filter(r => r !== null);
  } catch (error) {
    logger.error('Erro ao coletar preços em batch', { error: error.message });
    throw error;
  }
}

module.exports = {
  scrapeCompetitorPrices,
  scrapeCompetitorPricesBatch,
};

