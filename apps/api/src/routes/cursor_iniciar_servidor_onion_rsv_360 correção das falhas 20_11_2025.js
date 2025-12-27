/**
 * 🧠 CHAIN OF THOUGHT: APIs Administrativas CRUD para Website Content
 * 🦴 SKELETON OF THOUGHT: Validação → Autenticação → Operação → Cache → Resposta
 * 🌳 TREE OF THOUGHT: Joi validation + JWT auth + Redis cache + Error handling
 * ✅ SELF CONSISTENCY: Dados consistentes e validações robustas
 */

const express = require("express");
const Joi = require("joi");
const router = express.Router();
const { db } = require("../config/database");

// 🛡️ Sanitização básica de entradas para evitar scripts/HTML malicioso
const sanitizeValue = (val) => {
  if (typeof val !== "string") return val;
  let out = val;
  // Remove <script>...</script>
  out = out.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  // Remove atributos inline on*
  out = out
    .replace(/on[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/on[a-z]+\s*=\s*'[^']*'/gi, "")
    .replace(/on[a-z]+\s*=\s*[^\s>]+/gi, "");
  // Remove tags angulares restantes
  out = out.replace(/[<>]/g, "");
  return out;
};

const sanitizeObject = (input) => {
  if (Array.isArray(input)) {
    return input.map((v) => sanitizeObject(v));
  }
  if (input && typeof input === "object") {
    const cleaned = {};
    Object.keys(input).forEach((k) => {
      cleaned[k] = sanitizeObject(input[k]);
    });
    return cleaned;
  }
  return sanitizeValue(input);
};

// 📊 DADOS MIGRADOS (mesmo do website-real.js)
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

// Coleção de Tickets (ingressos) - inicia vazia e preenchida via Admin API
const ticketsData = [];

// 🔐 MIDDLEWARE DE AUTENTICAÇÃO SIMULADO
const authenticateAdmin = (req, res, next) => {
  // Em produção, usar JWT real
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      error: "Token de autenticação obrigatório",
    });
  }

  const token = authHeader.substring(7);

  // Simulação de validação de token
  if (token !== "admin-token-123") {
    return res.status(403).json({
      success: false,
      error: "Token inválido ou expirado",
    });
  }

  req.user = { id: 1, role: "admin", name: "Administrador" };
  next();
};

// 📋 VALIDAÇÕES JOI
const contentValidationSchema = Joi.object({
  page_type: Joi.string()
    .valid("hotels", "promotions", "attractions", "tickets")
    .required(),
  content_id: Joi.string().pattern(/^[a-zA-Z0-9-_]+$/).min(3).max(50).required(),
  title: Joi.string().min(3).max(255).required(),
  description: Joi.string().min(10).max(1000).required(),
  images: Joi.array().items(Joi.string().pattern(/^(\/|https?:\/\/)/)).min(1).max(10).required(),
  metadata: Joi.object().required(),
  seo_data: Joi.object({
    title: Joi.string().min(10).max(255).required(),
    description: Joi.string().min(20).max(500).required(),
    keywords: Joi.array().items(Joi.string()).min(1).max(10).required(),
  }).required(),
  status: Joi.string().valid("active", "inactive", "draft").default("active"),
  order_index: Joi.number().integer().min(0).default(0),
});

// Permitir atualização parcial (todos os campos opcionais)
const updateValidationSchema = Joi.object({
  page_type: Joi.string().valid(
    "hotels",
    "promotions",
    "attractions",
    "tickets",
  ),
  content_id: Joi.string().pattern(/^[a-zA-Z0-9-_]+$/).min(3).max(50),
  title: Joi.string().min(3).max(255),
  description: Joi.string().min(10).max(1000),
  images: Joi.array().items(Joi.string().uri()).min(1).max(10),
  metadata: Joi.object(),
  seo_data: Joi.object({
    title: Joi.string().min(10).max(255),
    description: Joi.string().min(20).max(500),
    keywords: Joi.array().items(Joi.string()).min(1).max(10),
  }),
  status: Joi.string().valid("active", "inactive", "draft"),
  order_index: Joi.number().integer().min(0),
});

// 🗂️ FUNÇÕES AUXILIARES
// Exportar função para uso em outras rotas - AGORA USA BANCO DE DADOS
const getDataCollection = async (pageType) => {
  try {
    // Buscar do banco de dados PostgreSQL
    const data = await db("website_content")
      .where("page_type", pageType)
      .where("status", "active")
      .orderBy("order_index", "asc")
      .select("*");

    // Converter campos JSONB de volta para objetos
    return data.map((item) => ({
      id: item.id,
      content_id: item.content_id,
      title: item.title,
      description: item.description,
      images: item.images || [],
      metadata: item.metadata || {},
      seo_data: item.seo_data || {},
      status: item.status,
      order_index: item.order_index,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));
  } catch (error) {
    console.error(`❌ Erro ao buscar ${pageType} do banco:`, error.message);
    // Fallback para dados em memória se o banco falhar
    console.log(`⚠️  Usando fallback para ${pageType}`);
    switch (pageType) {
      case "hotels":
        return hotelData;
      case "promotions":
        return promotionsData;
      case "attractions":
        return attractionsData;
      case "tickets":
        return ticketsData;
      default:
        return [];
    }
  }
};

const generateNextId = (collection) => {
  return Math.max(...collection.map((item) => item.id), 0) + 1;
};

const invalidateCache = (pageType) => {
  // Em produção, invalidar cache Redis
  console.log(`🔄 Cache invalidado para: ${pageType}`);
  return true;
};

// 📝 POST - Criar novo conteúdo
router.post("/content", authenticateAdmin, async (req, res) => {
  console.log("🎯 POST /api/admin/website/content - Criar conteúdo");

  // Sanitizar payload antes de validar
  req.body = sanitizeObject(req.body);

  const { error, value } = contentValidationSchema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      error: "Dados inválidos",
      details: error.details.map((d) => d.message),
    });
  }

  const { page_type, content_id } = value;

  // Validar tipo de página
  if (!["hotels", "promotions", "attractions", "tickets"].includes(page_type)) {
    return res.status(400).json({
      success: false,
      error: `Tipo de página '${page_type}' não suportado`,
    });
  }

  try {
    // Verificar se content_id já existe no banco
    const existingItem = await db("website_content")
      .where("page_type", page_type)
      .where("content_id", content_id)
      .first();

    if (existingItem) {
      return res.status(409).json({
        success: false,
        error: `Conteúdo com ID '${content_id}' já existe`,
      });
    }

    // Criar novo item no banco
    const [newItem] = await db("website_content")
      .insert({
        page_type: value.page_type,
        content_id: value.content_id,
        title: value.title,
        description: value.description,
        images: db.raw("?::jsonb", [JSON.stringify(value.images)]),
        metadata: db.raw("?::jsonb", [JSON.stringify(value.metadata)]),
        seo_data: db.raw("?::jsonb", [JSON.stringify(value.seo_data)]),
        status: value.status || "active",
        order_index: value.order_index || 0,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning("*");

    // Converter campos JSONB de volta para objetos
    const result = {
      id: newItem.id,
      content_id: newItem.content_id,
      title: newItem.title,
      description: newItem.description,
      images: typeof newItem.images === 'string' ? JSON.parse(newItem.images) : newItem.images,
      metadata: typeof newItem.metadata === 'string' ? JSON.parse(newItem.metadata) : newItem.metadata,
      seo_data: typeof newItem.seo_data === 'string' ? JSON.parse(newItem.seo_data) : newItem.seo_data,
      status: newItem.status,
      order_index: newItem.order_index,
      created_at: newItem.created_at,
      updated_at: newItem.updated_at,
    };

    invalidateCache(page_type);

    res.status(201).json({
      success: true,
      message: "Conteúdo criado com sucesso",
      data: result,
    });
  } catch (dbError) {
    console.error("❌ Erro ao criar conteúdo no banco:", dbError);
    res.status(500).json({
      success: false,
      error: "Erro ao salvar no banco de dados",
      details: dbError.message,
    });
  }
});

// 📖 GET - Listar todo o conteúdo
router.get("/content", authenticateAdmin, async (req, res) => {
  console.log("🎯 GET /api/admin/website/content - Listar todo conteúdo");

  try {
    // Buscar todos os tipos de conteúdo do banco
    const [hotels, promotions, attractions, tickets] = await Promise.all([
      getDataCollection("hotels"),
      getDataCollection("promotions"),
      getDataCollection("attractions"),
      getDataCollection("tickets"),
    ]);

    const allContent = {
      hotels,
      promotions,
      attractions,
      tickets,
    };

    res.json({
      success: true,
      data: allContent,
      totals: {
        hotels: hotels.length,
        promotions: promotions.length,
        attractions: attractions.length,
        tickets: tickets.length,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao buscar conteúdo:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao buscar conteúdo do banco de dados",
      details: error.message,
    });
  }
});

// 📖 GET - Listar conteúdo por tipo
router.get("/content/:pageType", authenticateAdmin, async (req, res) => {
  const { pageType } = req.params;
  console.log(`🎯 GET /api/admin/website/content/${pageType}`);

  try {
    const collection = await getDataCollection(pageType);

    if (!collection || (Array.isArray(collection) && collection.length === 0 && !["hotels", "promotions", "attractions", "tickets"].includes(pageType))) {
      return res.status(400).json({
        success: false,
        error: `Tipo de página '${pageType}' não suportado`,
      });
    }

    res.json({
      success: true,
      data: collection.sort((a, b) => (a.order_index || 0) - (b.order_index || 0)),
      pageType: pageType,
      total: collection.length,
    });
  } catch (error) {
    console.error(`❌ Erro ao buscar ${pageType}:`, error);
    res.status(500).json({
      success: false,
      error: "Erro ao buscar conteúdo do banco de dados",
      details: error.message,
    });
  }
});

// 📖 GET - Buscar conteúdo por ID
router.get("/content/:pageType/:contentId", authenticateAdmin, async (req, res) => {
  const { pageType, contentId } = req.params;
  console.log(`🎯 GET /api/admin/website/content/${pageType}/${contentId}`);

  try {
    const item = await db("website_content")
      .where("page_type", pageType)
      .where("content_id", contentId)
      .first();

    if (!item) {
      return res.status(404).json({
        success: false,
        error: `Conteúdo '${contentId}' não encontrado`,
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

// ✏️ PUT - Atualizar conteúdo
router.put("/content/:pageType/:contentId", authenticateAdmin, async (req, res) => {
  const { pageType, contentId } = req.params;
  console.log(`🎯 PUT /api/admin/website/content/${pageType}/${contentId}`);

  // Sanitizar payload antes de validar
  req.body = sanitizeObject(req.body);

  const { error, value } = updateValidationSchema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      error: "Dados inválidos",
      details: error.details.map((d) => d.message),
    });
  }

  try {
    // Verificar se item existe
    const existingItem = await db("website_content")
      .where("page_type", pageType)
      .where("content_id", contentId)
      .first();

    if (!existingItem) {
      return res.status(404).json({
        success: false,
        error: `Conteúdo '${contentId}' não encontrado`,
      });
    }

    // Preparar dados para atualização
    const updateData = {
      updated_at: new Date(),
    };

    if (value.title) updateData.title = value.title;
    if (value.description) updateData.description = value.description;
    if (value.images) updateData.images = db.raw("?::jsonb", [JSON.stringify(value.images)]);
    if (value.metadata) updateData.metadata = db.raw("?::jsonb", [JSON.stringify(value.metadata)]);
    if (value.seo_data) updateData.seo_data = db.raw("?::jsonb", [JSON.stringify(value.seo_data)]);
    if (value.status) updateData.status = value.status;
    if (value.order_index !== undefined) updateData.order_index = value.order_index;

    // Atualizar no banco
    const [updatedItem] = await db("website_content")
      .where("page_type", pageType)
      .where("content_id", contentId)
      .update(updateData)
      .returning("*");

    // Converter campos JSONB
    const result = {
      id: updatedItem.id,
      content_id: updatedItem.content_id,
      title: updatedItem.title,
      description: updatedItem.description,
      images: typeof updatedItem.images === 'string' ? JSON.parse(updatedItem.images) : updatedItem.images,
      metadata: typeof updatedItem.metadata === 'string' ? JSON.parse(updatedItem.metadata) : updatedItem.metadata,
      seo_data: typeof updatedItem.seo_data === 'string' ? JSON.parse(updatedItem.seo_data) : updatedItem.seo_data,
      status: updatedItem.status,
      order_index: updatedItem.order_index,
      created_at: updatedItem.created_at,
      updated_at: updatedItem.updated_at,
    };

    invalidateCache(pageType);

    res.json({
      success: true,
      message: "Conteúdo atualizado com sucesso",
      data: result,
    });
  } catch (dbError) {
    console.error("❌ Erro ao atualizar conteúdo:", dbError);
    res.status(500).json({
      success: false,
      error: "Erro ao atualizar no banco de dados",
      details: dbError.message,
    });
  }
});

// 🗑️ DELETE - Deletar conteúdo
router.delete(
  "/content/:pageType/:contentId",
  authenticateAdmin,
  async (req, res) => {
    const { pageType, contentId } = req.params;
    console.log(
      `🎯 DELETE /api/admin/website/content/${pageType}/${contentId}`,
    );

    try {
      // Verificar se item existe
      const existingItem = await db("website_content")
        .where("page_type", pageType)
        .where("content_id", contentId)
        .first();

      if (!existingItem) {
        return res.status(404).json({
          success: false,
          error: `Conteúdo '${contentId}' não encontrado`,
        });
      }

      // Deletar do banco
      await db("website_content")
        .where("page_type", pageType)
        .where("content_id", contentId)
        .delete();

      invalidateCache(pageType);

      res.json({
        success: true,
        message: "Conteúdo deletado com sucesso",
        data: {
          content_id: contentId,
          page_type: pageType,
        },
      });
    } catch (dbError) {
      console.error("❌ Erro ao deletar conteúdo:", dbError);
      res.status(500).json({
        success: false,
        error: "Erro ao deletar do banco de dados",
        details: dbError.message,
      });
    }
  },
);

// 🔄 PATCH - Atualizar status
router.patch(
  "/content/:pageType/:contentId/status",
  authenticateAdmin,
  async (req, res) => {
    const { pageType, contentId } = req.params;
    const { status } = req.body;
    console.log(
      `🎯 PATCH /api/admin/website/content/${pageType}/${contentId}/status`,
    );

    // Sanitizar campo status
    req.body = sanitizeObject(req.body);

    if (!status || !["active", "inactive", "draft"].includes(status)) {
      return res.status(400).json({
        success: false,
        error: "Status inválido. Use: active, inactive ou draft",
      });
    }

    try {
      // Verificar se item existe
      const existingItem = await db("website_content")
        .where("page_type", pageType)
        .where("content_id", contentId)
        .first();

      if (!existingItem) {
        return res.status(404).json({
          success: false,
          error: `Conteúdo '${contentId}' não encontrado`,
        });
      }

      // Atualizar status no banco
      const [updatedItem] = await db("website_content")
        .where("page_type", pageType)
        .where("content_id", contentId)
        .update({
          status: status,
          updated_at: new Date(),
        })
        .returning("*");

      // Converter campos JSONB
      const result = {
        id: updatedItem.id,
        content_id: updatedItem.content_id,
        title: updatedItem.title,
        description: updatedItem.description,
        images: typeof updatedItem.images === 'string' ? JSON.parse(updatedItem.images) : updatedItem.images,
        metadata: typeof updatedItem.metadata === 'string' ? JSON.parse(updatedItem.metadata) : updatedItem.metadata,
        seo_data: typeof updatedItem.seo_data === 'string' ? JSON.parse(updatedItem.seo_data) : updatedItem.seo_data,
        status: updatedItem.status,
        order_index: updatedItem.order_index,
        created_at: updatedItem.created_at,
        updated_at: updatedItem.updated_at,
      };

      invalidateCache(pageType);

      res.json({
        success: true,
        message: `Status alterado para '${status}' com sucesso`,
        data: result,
      });
    } catch (dbError) {
      console.error("❌ Erro ao atualizar status:", dbError);
      res.status(500).json({
        success: false,
        error: "Erro ao atualizar status no banco de dados",
        details: dbError.message,
      });
    }
  },
);

// 🔄 PATCH - Reordenar conteúdo
router.patch("/content/:pageType/reorder", authenticateAdmin, async (req, res) => {
  const { pageType } = req.params;
  const { items } = req.body;
  console.log(`🎯 PATCH /api/admin/website/content/${pageType}/reorder`);

  // Sanitizar lista de items
  req.body = sanitizeObject(req.body);

  if (!Array.isArray(items)) {
    return res.status(400).json({
      success: false,
      error: "Array de items é obrigatório",
    });
  }

  try {
    // Atualizar order_index de cada item no banco
    const updatePromises = items.map((item, index) =>
      db("website_content")
        .where("page_type", pageType)
        .where("content_id", item.content_id || item.id)
        .update({
          order_index: index,
          updated_at: new Date(),
        })
    );

    await Promise.all(updatePromises);

    invalidateCache(pageType);

    res.json({
      success: true,
      message: "Conteúdo reordenado com sucesso",
      data: { updated: items.length },
    });
  } catch (dbError) {
    console.error("❌ Erro ao reordenar conteúdo:", dbError);
    res.status(500).json({
      success: false,
      error: "Erro ao reordenar no banco de dados",
      details: dbError.message,
    });
  }
});

// ✅ SELF CONSISTENCY: Error handling
router.use((err, req, res, next) => {
  console.error("❌ Erro na API Admin Website:", err.message);
  res.status(500).json({
    success: false,
    error: "Erro interno do servidor",
    message: err.message,
  });
});

// Exportar função getDataCollection para uso em outras rotas
module.exports = router;
module.exports.getDataCollection = getDataCollection;
