/**
 * VERSÃO CORRIGIDA - GET Conteúdo por Tipo
 * Garante que sempre retorna um array válido
 */

// Função auxiliar para garantir array
const ensureArray = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === 'object') {
    if (Array.isArray(value.data)) return value.data;
    if (Array.isArray(value.items)) return value.items;
    if (Array.isArray(value.results)) return value.results;
  }
  return [];
};

// Função auxiliar para normalizar dados
const normalizeData = (data, pageType) => {
  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }

  try {
    if (pageType === "hotels") {
      return data.map((item) => ({
        ...item,
        price: item.price ?? item.metadata?.price ?? 0,
        original_price: item.original_price ?? item.metadata?.originalPrice ?? 0,
      }));
    } else if (pageType === "promotions") {
      return data.map((item) => ({
        ...item,
        price: item.price ?? item.metadata?.price ?? 199,
        original_price: item.original_price ?? item.metadata?.originalPrice ?? 249,
      }));
    } else if (pageType === "attractions" || pageType === "tickets") {
      return data.map((item) => ({
        ...item,
        price: item.price ?? item.metadata?.price ?? 0,
        original_price: item.original_price ?? item.metadata?.originalPrice ?? undefined,
      }));
    }
    return data;
  } catch (error) {
    console.error(`❌ Erro ao normalizar dados para ${pageType}:`, error);
    return data; // Retornar dados originais se normalização falhar
  }
};

// Rota GET corrigida
const getContentRoute = async (req, res) => {
  const { pageType } = req.params;
  console.log(`🎯 GET /api/website/content/${pageType}`);

  let finalData = [];

  try {
    // 1. Tentar buscar do CMS
    try {
      const adminWebsite = require("./admin-website");
      const collection = await adminWebsite.getDataCollection(pageType);
      finalData = ensureArray(collection);
      console.log(`📊 Dados do CMS para ${pageType}: ${finalData.length} itens`);
    } catch (cmsError) {
      console.error(`⚠️  Erro ao buscar do CMS:`, cmsError.message);
      finalData = [];
    }

    // 2. Se não tiver dados, usar fallback estático
    if (!Array.isArray(finalData) || finalData.length === 0) {
      console.log(`⚠️  Usando fallback estático para ${pageType}`);
      const { hotelData, promotionsData, attractionsData, ticketsData } = require("./website-real");
      
      switch (pageType) {
        case "hotels":
          finalData = ensureArray(hotelData);
          break;
        case "promotions":
          finalData = ensureArray(promotionsData);
          break;
        case "attractions":
          finalData = ensureArray(attractionsData);
          break;
        case "tickets":
          finalData = ensureArray(ticketsData);
          break;
        default:
          return res.status(400).json({
            success: false,
            error: `Tipo de página '${pageType}' não suportado`,
          });
      }
    }

    // 3. GARANTIA FINAL: finalData DEVE ser array
    if (!Array.isArray(finalData)) {
      console.error(`❌ ERRO CRÍTICO: finalData não é array!`, typeof finalData);
      finalData = [];
    }

    // 4. Normalizar dados
    const normalized = normalizeData(finalData, pageType);

    // 5. Retornar resposta
    res.json({
      success: true,
      data: normalized,
      pageType: pageType,
      total: normalized.length,
      source: "migrated_data",
    });

  } catch (error) {
    console.error(`❌ Erro fatal em /api/website/content/${pageType}:`, error);
    res.status(500).json({
      success: false,
      error: "Erro interno do servidor",
      details: error.message,
    });
  }
};

module.exports = getContentRoute;

