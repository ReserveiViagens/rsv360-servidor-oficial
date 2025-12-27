/**
 * 🏠 Rotas RSV360 - Properties
 * FASE 3.2: Rotas de propriedades multipropriedade
 * Suporta upload de imagens e gerenciamento completo
 */

const express = require("express");
const Joi = require("joi");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const router = express.Router();
const { db } = require("../config/database");
const propertyService = require("../services/propertyService");
const { advancedJWTValidation, requireRole, requireOwnership } = require("../middleware/advancedAuth");
const { getPropertyOwnerId } = require("../middleware/ownershipHelpers");
// FASE C6: Validação e processamento de imagens
const { validateImages } = require("../utils/imageValidation");
const { processImages, removeOriginal } = require("../utils/imageProcessing");
// FASE C7: Rate limiting específico
const { propertiesRateLimiter } = require("../middleware/rateLimiter");

// Usar advancedAuth (FASE 4)
const authenticate = advancedJWTValidation;

// FASE C7: Aplicar rate limiting em todas as rotas de properties
router.use(propertiesRateLimiter);

// Configuração de upload
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadsDir = path.join(__dirname, "../../uploads/properties");
    await fs.mkdir(uploadsDir, { recursive: true });
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `property-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Apenas imagens são permitidas"), false);
    }
  },
});

// Schema de validação
const propertySchema = Joi.object({
  owner_id: Joi.number().integer().optional(),
  type: Joi.string()
    .valid("apartment", "house", "chalet", "flat", "bungalow", "villa", "condo")
    .required(),
  title: Joi.string().required(),
  description: Joi.string().optional().allow(""),
  address_street: Joi.string().required(),
  address_city: Joi.string().required(),
  address_state: Joi.string().required(),
  address_zip_code: Joi.string().optional().allow(""),
  address_country: Joi.string().default("Brasil"),
  latitude: Joi.number().optional(),
  longitude: Joi.number().optional(),
  bedrooms: Joi.number().integer().optional(),
  bathrooms: Joi.number().integer().optional(),
  max_guests: Joi.number().integer().min(1).required(),
  area_sqm: Joi.number().optional(),
  base_price: Joi.number().positive().required(),
  cleaning_fee: Joi.number().default(0),
  amenities: Joi.array().items(Joi.string()).default([]),
  min_stay: Joi.number().integer().default(1),
  check_in_time: Joi.string().default("14:00"),
  check_out_time: Joi.string().default("11:00"),
  cancellation_policy: Joi.string().optional().allow(""),
});

/**
 * POST /api/rsv360/properties
 * Criar nova propriedade com upload de imagens
 */
router.post("/", authenticate, upload.array("images", 10), async (req, res) => {
  try {
    // Parse dados do formulário
    const propertyData = req.body.data ? JSON.parse(req.body.data) : req.body;
    const { error, value } = propertySchema.validate(propertyData);

    if (error) {
      return res.status(400).json({
        error: "Dados inválidos",
        details: error.details.map((d) => d.message),
      });
    }

    // FASE C6: Validar e processar imagens
    const imageUrls = [];
    if (req.files && req.files.length > 0) {
      // Validar imagens
      const validation = await validateImages(req.files);
      
      if (!validation.valid) {
        // Remover arquivos inválidos
        for (const file of req.files) {
          try {
            await fs.unlink(file.path);
          } catch (e) {
            // Ignorar erro
          }
        }
        
        return res.status(400).json({
          error: "Erro na validação de imagens",
          details: validation.errors,
        });
      }

      // Processar e otimizar imagens válidas
      try {
        const processedResults = await processImages(validation.validFiles, {
          format: 'webp',
          quality: 85,
          maxWidth: 1920,
          maxHeight: 1920,
          createThumbnail: true,
        });

        // Adicionar URLs das imagens processadas
        for (const result of processedResults) {
          if (result.error) {
            console.warn(`⚠️  Erro ao processar imagem ${result.original}:`, result.error);
            continue;
          }

          const relativePath = `/uploads/properties/${path.basename(result.path)}`;
          imageUrls.push(relativePath);

          // Remover arquivo original após processamento
          const originalFile = validation.validFiles.find(f => f.originalname === result.original);
          if (originalFile && originalFile.path !== result.path) {
            await removeOriginal(originalFile.path);
          }
        }
      } catch (processingError) {
        console.error("❌ Erro ao processar imagens:", processingError);
        // Continuar mesmo se processamento falhar (usar imagens originais)
        for (const file of validation.validFiles) {
          const relativePath = `/uploads/properties/${path.basename(file.path)}`;
          imageUrls.push(relativePath);
        }
      }
    }

    // Criar propriedade usando service
    const propertyData = {
      ...value,
      images: imageUrls,
    };

    const newProperty = await propertyService.createProperty(propertyData);

    res.status(201).json({
      success: true,
      property: {
        id: newProperty.id,
        title: newProperty.title,
        type: newProperty.type,
        images: newProperty.images,
        status: newProperty.status,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao criar propriedade:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
    });
  }
});

/**
 * GET /api/rsv360/properties
 * Listar propriedades com filtros e cache
 */
router.get("/", async (req, res) => {
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
    } = req.query;

    // Buscar propriedades usando service
    const result = await propertyService.searchProperties({
      type,
      city,
      min_price,
      max_price,
      bedrooms,
      check_in,
      check_out,
      page,
      limit,
    });

    res.json({
      success: true,
      properties: result.properties,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("❌ Erro ao listar propriedades:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
    });
  }
});

/**
 * GET /api/rsv360/properties/my
 * Listar propriedades do usuário autenticado
 */
router.get("/my", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 100 } = req.query;

    const properties = await db("properties")
      .where("owner_id", userId)
      .where("status", "active")
      .orderBy("created_at", "desc")
      .limit(parseInt(limit))
      .offset((parseInt(page) - 1) * parseInt(limit));

    // Parse JSON fields
    const parsedProperties = properties.map((prop) => ({
      id: prop.id,
      title: prop.title,
      location: `${prop.address_city}, ${prop.address_state}`,
      address_city: prop.address_city,
      address_state: prop.address_state,
      type: prop.type,
      base_price: prop.base_price,
      max_guests: prop.max_guests,
      bedrooms: prop.bedrooms,
      bathrooms: prop.bathrooms,
      images: typeof prop.images === 'string' ? JSON.parse(prop.images || '[]') : (prop.images || []),
    }));

    res.json({
      success: true,
      properties: parsedProperties,
    });
  } catch (error) {
    console.error("❌ Erro ao listar propriedades do usuário:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
    });
  }
});

/**
 * GET /api/rsv360/properties/:id
 * Obter propriedade específica com cache
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Obter propriedade usando service
    const property = await propertyService.getPropertyById(parseInt(id));

    if (!property) {
      return res.status(404).json({
        error: "Propriedade não encontrada",
      });
    }

    res.json({
      success: true,
      property,
    });
  } catch (error) {
    console.error("❌ Erro ao obter propriedade:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
    });
  }
});

/**
 * PUT /api/rsv360/properties/:id
 * Atualizar propriedade
 */
router.put("/:id", authenticate, requireOwnership(getPropertyOwnerId), async (req, res) => {
  try {
    const { id } = req.params;

    // Atualizar propriedade usando service
    const property = await propertyService.updateProperty(parseInt(id), req.body);

    res.json({
      success: true,
      property,
      message: "Propriedade atualizada com sucesso",
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar propriedade:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
    });
  }
});

/**
 * GET /api/rsv360/properties/:id/calendar
 * Obter calendário de disponibilidade
 */
router.get("/:id/calendar", async (req, res) => {
  try {
    const { id } = req.params;
    const { year, month } = req.query;

    // Obter calendário usando service
    const calendar = await propertyService.getPropertyCalendar(
      parseInt(id),
      year ? parseInt(year) : undefined,
      month ? parseInt(month) : undefined,
    );

    res.json({
      success: true,
      ...calendar,
    });
  } catch (error) {
    console.error("❌ Erro ao obter calendário:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
    });
  }
});

/**
 * DELETE /api/rsv360/properties/:id
 * Deletar propriedade (soft delete)
 */
router.delete("/:id", authenticate, requireOwnership(getPropertyOwnerId), async (req, res) => {
  try {
    const { id } = req.params;

    // Deletar propriedade usando service
    await propertyService.deleteProperty(parseInt(id));

    res.json({
      success: true,
      message: "Propriedade deletada com sucesso",
    });
  } catch (error) {
    console.error("❌ Erro ao deletar propriedade:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
    });
  }
});

module.exports = router;

