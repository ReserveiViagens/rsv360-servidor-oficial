/**
 * 🧠 CHAIN OF THOUGHT: APIs Website com dados migrados integrados
 * 🦴 SKELETON OF THOUGHT: Mock Data → Database Ready → Cache Redis
 * 🌳 TREE OF THOUGHT: Prioridade = funcionamento > banco > otimização
 * ✅ SELF CONSISTENCY: Dados consistentes entre endpoints
 */

const express = require("express");
const router = express.Router();
const { db } = require("../config/database");

// 🔗 Importar função para obter dados dinâmicos do admin
// Isso garante que os dados públicos sejam os mesmos gerenciados pelo CMS
const getDataCollection = async (pageType) => {
  try {
    // Importar dados do admin-website dinamicamente
    const adminWebsite = require("./admin-website");
    
    // Verificar se a função existe
    if (!adminWebsite || typeof adminWebsite.getDataCollection !== 'function') {
      console.error('❌ getDataCollection não está disponível em admin-website');
      return [];
    }
    
    const result = await adminWebsite.getDataCollection(pageType);
    
    // Garantir que retorna array
    if (!Array.isArray(result)) {
      console.warn(`⚠️  getDataCollection retornou ${typeof result}, convertendo para array`);
      return [];
    }
    
    return result;
  } catch (error) {
    console.error(`❌ Erro ao chamar getDataCollection para ${pageType}:`, error.message);
    console.error('Stack:', error.stack);
    return [];
  }
};

// 📊 DADOS MIGRADOS DO SITE (TAREFA 3 CONCLUÍDA) - Mantido como fallback
const hotelData = [
  {
    id: 1,
    content_id: "spazzio-diroma",
    title: "Spazzio DiRoma",
    description:
      "Conforto e lazer completo com a qualidade diRoma. Piscinas termais naturais e estrutura completa para toda família.",
    images: [
      "/images/spazzio-diroma-hotel.jpg",
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/reservei%20Viagens%20%281%29.jpg-7DhCDbMcNkgFfxxptkCNaraAWv9kQ7.jpeg",
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/reservei%20Viagens%20%282%29.jpg-MjqWbBqajq4aJnz0SdR4sDrHr11Jv7.jpeg",
    ],
    metadata: {
      stars: 4,
      price: 250,
      originalPrice: 312.5,
      discount: 20,
      features: [
        "Piscinas Termais",
        "Acqua Park",
        "Restaurante",
        "Wi-Fi Gratuito",
        "Estacionamento",
      ],
      location: "Centro de Caldas Novas",
      capacity: "4 pessoas",
    },
    seo_data: {
      title: "Spazzio DiRoma - Hotel com Piscinas Termais em Caldas Novas",
      description:
        "Reserve o Spazzio DiRoma com 20% de desconto. Piscinas termais naturais, Acqua Park e estrutura completa.",
      keywords: [
        "hotel caldas novas",
        "piscinas termais",
        "acqua park",
        "diroma",
      ],
    },
    status: "active",
    order_index: 1,
  },
  {
    id: 2,
    content_id: "piazza-diroma",
    title: "Piazza DiRoma",
    description:
      "Sofisticação e acesso privilegiado aos parques diRoma. Arquitetura italiana e serviços premium.",
    images: [
      "/images/piazza-diroma-hotel.jpg",
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Piazza%20Didroma%20reservei%20Viagens%20%286%29.jpg-34SGE3Ulyc1owoVthnaoD8TTKMsPh7.jpeg",
    ],
    metadata: {
      stars: 5,
      price: 260,
      originalPrice: 325,
      discount: 20,
      features: [
        "Arquitetura Italiana",
        "Spa Premium",
        "Piscinas Exclusivas",
        "Restaurante Gourmet",
        "Concierge",
      ],
      location: "Área Nobre - Caldas Novas",
      capacity: "4 pessoas",
    },
    seo_data: {
      title: "Piazza DiRoma - Hotel 5 Estrelas com Arquitetura Italiana",
      description:
        "Luxo e sofisticação no Piazza DiRoma. Spa premium, piscinas exclusivas e arquitetura italiana única.",
      keywords: [
        "hotel 5 estrelas",
        "arquitetura italiana",
        "spa premium",
        "caldas novas luxo",
      ],
    },
    status: "active",
    order_index: 2,
  },
  {
    id: 3,
    content_id: "lacqua-diroma",
    title: "Lacqua DiRoma",
    description:
      "Parque aquático exclusivo e diversão para toda a família. Toboáguas e piscinas de ondas incríveis.",
    images: [
      "/images/lacqua-diroma-hotel.png",
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/184981043%20%281%29-I2iuBzXMrj8RLrl2o2tI55osVahFhB.jpeg",
    ],
    metadata: {
      stars: 4,
      price: 440,
      originalPrice: 550,
      discount: 20,
      features: [
        "Jardins Acqua Park",
        "Piscinas de Ondas",
        "Toboáguas",
        "Ofurôs",
        "Kids Club",
      ],
      location: "Próximo ao Centro",
      capacity: "4 pessoas",
    },
    seo_data: {
      title: "Lacqua DiRoma - Hotel com Parque Aquático Exclusivo",
      description:
        "Diversão garantida no Lacqua DiRoma. Parque aquático, toboáguas e piscinas de ondas para toda família.",
      keywords: [
        "parque aquático",
        "toboáguas",
        "piscinas de ondas",
        "família caldas novas",
      ],
    },
    status: "active",
    order_index: 3,
  },
  {
    id: 4,
    content_id: "diroma-fiori",
    title: "DiRoma Fiori",
    description:
      "Hotel aconchegante com piscinas termais e tranquilidade. Perfeito para relaxar em família.",
    images: [
      "/images/diroma-fiori-hotel.jpeg",
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/reserveiviagens%20%2825%29.jpg-AqUPM5y6756BhEMFxJMJ8b8tPzW9OB.jpeg",
    ],
    metadata: {
      stars: 3,
      price: 407,
      originalPrice: 508.75,
      discount: 20,
      features: [
        "Ambiente Familiar",
        "Piscinas Termais",
        "Sauna",
        "Jardins",
        "Playground",
      ],
      location: "Zona Residencial",
      capacity: "5 pessoas",
    },
    seo_data: {
      title: "DiRoma Fiori - Hotel Familiar com Piscinas Termais",
      description:
        "Tranquilidade e conforto no DiRoma Fiori. Ambiente familiar, piscinas termais e jardins relaxantes.",
      keywords: [
        "hotel familiar",
        "piscinas termais",
        "tranquilidade",
        "jardins",
      ],
    },
    status: "active",
    order_index: 4,
  },
  {
    id: 5,
    content_id: "lagoa-eco-towers",
    title: "Lagoa Eco Towers",
    description:
      "Luxo e sustentabilidade em Caldas Novas. Torres ecológicas com vista panorâmica e serviços premium.",
    images: [
      "/images/lagoa-eco-towers-hotel.jpeg",
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/reservei%20lagoa%20eco%20towers.jpg-eflMoZcTLPAcWwsw2jeNXRi7xiNkHe.jpeg",
    ],
    metadata: {
      stars: 5,
      price: 850,
      originalPrice: 1062.5,
      discount: 20,
      features: [
        "Torres Ecológicas",
        "Vista Panorâmica",
        "Spa Completo",
        "Gastronomia Premium",
        "Sustentabilidade",
      ],
      location: "Área Premium",
      capacity: "7 pessoas",
    },
    seo_data: {
      title: "Lagoa Eco Towers - Hotel Ecológico Premium em Caldas Novas",
      description:
        "Sustentabilidade e luxo nas Torres Ecológicas. Vista panorâmica, spa completo e gastronomia premium.",
      keywords: [
        "hotel ecológico",
        "sustentabilidade",
        "vista panorâmica",
        "spa completo",
        "premium",
      ],
    },
    status: "active",
    order_index: 5,
  },
];

const promotionsData = [
  {
    id: 1,
    content_id: "promocao-especial-verao",
    title: "🔥 Ofertas Exclusivas de Verão!",
    description:
      "Até 20% OFF + Estacionamento GRÁTIS em todos os hotéis. Por tempo limitado!",
    images: ["/images/promocao-verao.jpg"],
    metadata: {
      discount: 20,
      benefits: ["20% desconto", "Estacionamento grátis", "Check-in flexível"],
      validUntil: "2025-03-31",
      featured: true,
    },
    seo_data: {
      title: "Promoção de Verão - 20% OFF em Hotéis de Caldas Novas",
      description:
        "Aproveite 20% de desconto e estacionamento grátis. Ofertas por tempo limitado!",
      keywords: ["promoção caldas novas", "20% desconto", "ofertas hotéis"],
    },
    status: "active",
    order_index: 1,
  },
];

const attractionsData = [
  {
    id: 1,
    content_id: "parque-das-aguas",
    title: "Parque das Águas Quentes",
    description:
      "O maior complexo de piscinas termais de Caldas Novas. Diversão para toda família com águas naturalmente aquecidas.",
    images: ["/images/parque-das-aguas.jpg"],
    metadata: {
      price: 50,
      type: "parque_aquatico",
      features: ["Piscinas termais", "Toboáguas", "Área kids", "Restaurante"],
      location: "Centro de Caldas Novas",
      hours: "08:00 - 18:00",
    },
    seo_data: {
      title: "Parque das Águas - Maior Complexo de Piscinas Termais",
      description:
        "Diversão garantida no Parque das Águas. Piscinas termais naturais e atrações para toda família.",
      keywords: [
        "parque das águas",
        "piscinas termais",
        "caldas novas",
        "águas quentes",
      ],
    },
    status: "active",
    order_index: 1,
  },
];

// 🎫 Ingressos (tickets) - reutilizando dados de atrações como exemplo
const ticketsData = [
  {
    id: 1,
    content_id: "ingresso-parque-aguas",
    title: "Ingresso Parque das Águas - Dia Inteiro",
    description:
      "Acesso total ao Parque das Águas Quentes por 1 dia. Diversão garantida!",
    images: ["/images/parque-das-aguas.jpg"],
    metadata: {
      duration: "Dia inteiro",
      ageGroup: "Todas as idades",
      features: ["Acesso total", "Reentrada permitida", "Válido em feriados"],
      category: "Parque",
    },
    seo_data: {
      title: "Ingresso Parque das Águas - Dia Inteiro",
      description:
        "Compre ingressos para o Parque das Águas Quentes com descontos especiais.",
      keywords: ["ingresso", "parque", "águas quentes", "caldas novas"],
    },
    status: "active",
    order_index: 1,
  },
];

const settingsData = {
  site_info: {
    title: "Reservei Viagens",
    tagline: "Parques, Hotéis & Atrações em Caldas Novas",
    description:
      "Especialistas em turismo em Caldas Novas. Os melhores hotéis, pacotes e atrações com desconto especial.",
  },
  contact_info: {
    phones: [
      "(64) 99319-7555",
      "(64) 99306-8752",
      "(65) 99235-1207",
      "(65) 99204-8814",
    ],
    email: "reservas@reserveiviagens.com.br",
    whatsapp: "5564993197555",
    address: "Rua RP5, Residencial Primavera 2, Caldas Novas, GO",
    filial: "Av. Manoel José de Arruda, Porto, Cuiabá, MT",
    fixo: "(65) 2127-0415",
    hours: "Seg-Sex 8h-18h, Sáb 8h-12h",
  },
  social_media: {
    facebook: "facebook.com/comercialreservei",
    instagram: "@reserveiviagens",
    website: "reserveiviagens.com.br",
  },
  seo_global: {
    title: "Reservei Viagens - Hotéis e Atrações em Caldas Novas",
    description:
      "Especialista em turismo em Caldas Novas. Hotéis com desconto, pacotes promocionais e as melhores atrações.",
    keywords: [
      "caldas novas",
      "hotéis caldas novas",
      "piscinas termais",
      "reservei viagens",
      "turismo goiás",
    ],
    og_image: "/images/og-reservei-viagens.jpg",
  },
};

// 🏥 Health check
router.get("/health", (req, res) => {
  res.json({
    status: "OK",
    message: "APIs Website com dados migrados funcionando!",
    timestamp: new Date().toISOString(),
    data_source: "migrated_from_site",
  });
});

// 📊 GET Configurações do Site
router.get("/settings", (req, res) => {
  console.log("🎯 GET /api/website/settings - dados migrados");

  res.json({
    success: true,
    data: settingsData,
    source: "migrated_data",
  });
});

// 📊 GET Conteúdo por Tipo - SINCRONIZADO COM CMS
router.get("/content/:pageType", async (req, res) => {
  const { pageType } = req.params;
  console.log(`🎯 GET /api/website/content/${pageType} - dados sincronizados com CMS`);

  // Função auxiliar para garantir que sempre retornamos um array
  const ensureArray = (value) => {
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') {
      if (Array.isArray(value.data)) return value.data;
      if (Array.isArray(value.items)) return value.items;
      if (Array.isArray(value.results)) return value.results;
    }
    return [];
  };

  // Usar dados dinâmicos do CMS (mesma fonte que o admin)
  let data = [];
  
  try {
    // Tentar buscar dados do CMS
    try {
      const collection = await getDataCollection(pageType);
      
      // Converter para array de forma segura
      data = ensureArray(collection);
      
      console.log(`📊 Dados obtidos para ${pageType}:`, {
        collectionType: typeof collection,
        collectionIsArray: Array.isArray(collection),
        dataLength: data.length,
        dataIsArray: Array.isArray(data)
      });
    } catch (cmsError) {
      console.error(`❌ Erro ao buscar do CMS para ${pageType}:`, cmsError.message);
      console.error('Stack:', cmsError.stack);
      data = [];
    }
    
    // Se não conseguiu dados do CMS, usar fallback estático
    if (!Array.isArray(data) || data.length === 0) {
      console.log(`⚠️  Sem dados do CMS, usando fallback estático para ${pageType}`);
      switch (pageType) {
        case "hotels":
          data = ensureArray(hotelData);
          break;
        case "promotions":
          data = ensureArray(promotionsData);
          break;
        case "attractions":
          data = ensureArray(attractionsData);
          break;
        case "tickets":
          data = ensureArray(ticketsData);
          break;
        default:
          return res.status(400).json({
            success: false,
            error: `Tipo de página '${pageType}' não suportado`,
          });
      }
    }
    
    // 3. GARANTIA FINAL: data DEVE ser array
    if (!Array.isArray(data)) {
      console.error(`❌ ERRO CRÍTICO: data não é array!`, typeof data);
      data = [];
    }
    
  } catch (err) {
    console.error(`❌ Erro geral ao buscar dados para ${pageType}:`, err.message);
    console.error('Stack completo:', err.stack);
    data = [];
  }

  // 4. GARANTIA ABSOLUTA: data DEVE ser array antes de normalizar
  if (!Array.isArray(data)) {
    console.error(`❌ ERRO CRÍTICO: data não é array antes de normalizar!`, typeof data);
    return res.status(500).json({
      success: false,
      error: "Erro interno: dados não estão no formato esperado",
      details: `Tipo recebido: ${typeof data}`
    });
  }

  // 5. Normalizar dados de forma segura
  let normalized = [];
  try {
    if (pageType === "hotels" && data.length > 0) {
      normalized = data.map((item) => ({
        ...item,
        price: item.price ?? item.metadata?.price ?? 0,
        original_price: item.original_price ?? item.metadata?.originalPrice ?? 0,
      }));
    } else if (pageType === "promotions" && data.length > 0) {
      normalized = data.map((item) => ({
        ...item,
        price: item.price ?? item.metadata?.price ?? 199,
        original_price: item.original_price ?? item.metadata?.originalPrice ?? 249,
      }));
    } else if ((pageType === "attractions" || pageType === "tickets") && data.length > 0) {
      normalized = data.map((item) => ({
        ...item,
        price: item.price ?? item.metadata?.price ?? 0,
        original_price: item.original_price ?? item.metadata?.originalPrice ?? undefined,
      }));
    } else {
      normalized = data;
    }
  } catch (normalizeError) {
    console.error(`❌ Erro ao normalizar dados:`, normalizeError);
    normalized = data; // Usar dados originais se normalização falhar
  }
  
  // 5. GARANTIA FINAL: normalized DEVE ser array
  if (!Array.isArray(normalized)) {
    console.error(`❌ ERRO CRÍTICO: normalized não é array!`, typeof normalized);
    normalized = [];
  }

  // 6. Retornar resposta
  res.json({
    success: true,
    data: normalized,
    pageType: pageType,
    total: normalized.length,
    source: "migrated_data",
  });
});

// 🔍 GET Conteúdo por ID
router.get("/content/:pageType/:contentId", async (req, res) => {
  const { pageType, contentId } = req.params;
  console.log(`🎯 GET /api/website/content/${pageType}/${contentId}`);

  try {
    // Buscar do banco de dados
    const item = await db("website_content")
      .where("page_type", pageType)
      .where("content_id", contentId)
      .where("status", "active")
      .first();

    if (!item) {
      return res.status(404).json({
        success: false,
        error: `Conteúdo '${contentId}' não encontrado em '${pageType}'`,
      });
    }

    // Converter campos JSONB
    const result = {
      id: item.id,
      content_id: item.content_id,
      title: item.title,
      description: item.description,
      images: typeof item.images === 'string' ? JSON.parse(item.images) : item.images,
      metadata: typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata,
      seo_data: typeof item.seo_data === 'string' ? JSON.parse(item.seo_data) : item.seo_data,
      status: item.status,
      order_index: item.order_index,
      created_at: item.created_at,
      updated_at: item.updated_at,
    };

    res.json({
      success: true,
      data: result,
      source: "database",
    });
  } catch (error) {
    console.error(`❌ Erro ao buscar ${contentId}:`, error);
    res.status(500).json({
      success: false,
      error: "Erro ao buscar conteúdo do banco de dados",
      details: error.message,
    });
  }
});

// ✅ SELF CONSISTENCY: Error handling
router.use((err, req, res, next) => {
  console.error("❌ Erro na API Website:", err.message);
  console.error("Stack completo:", err.stack);
  res.status(500).json({
    success: false,
    error: "Erro interno do servidor",
    message: err.message,
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

module.exports = router;
