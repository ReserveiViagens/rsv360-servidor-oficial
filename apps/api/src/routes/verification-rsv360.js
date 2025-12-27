/**
 * 🔐 Rotas RSV360 - Verification
 * FASE 1.4.4: Rotas de verificação de identidade e documentos
 */

const express = require("express");
const Joi = require("joi");
const router = express.Router();
const verificationService = require("../services/verificationService");
const { advancedJWTValidation, requireRole } = require("../middleware/advancedAuth");
const { publicRateLimiter } = require("../middleware/rateLimiter");
const { createLogger } = require("../utils/logger");

const logger = createLogger({ service: 'verificationRoutes' });
const authenticate = advancedJWTValidation;

// Aplicar rate limiting
router.use(publicRateLimiter);

// Schema de validação para verificação de identidade
const verifyIdentitySchema = Joi.object({
  cpf: Joi.string().required().pattern(/^\d{11}$/).message("CPF deve conter 11 dígitos"),
  nome: Joi.string().required().min(3).max(100),
  data_nascimento: Joi.date().iso().required(),
});

// Schema de validação para background check
const backgroundCheckSchema = Joi.object({
  cpf: Joi.string().required().pattern(/^\d{11}$/).message("CPF deve conter 11 dígitos"),
  nome: Joi.string().required().min(3).max(100),
  data_nascimento: Joi.date().iso().required(),
});

// Schema de validação para upload de documento
const uploadDocumentSchema = Joi.object({
  document_type: Joi.string().valid('cpf', 'cnpj', 'rg', 'passport', 'driver_license').required(),
  document_number: Joi.string().required(),
  file_url: Joi.string().uri().optional(),
});

/**
 * POST /api/rsv360/verification/request
 * Solicitar verificação de identidade
 */
router.post("/request", authenticate, async (req, res) => {
  try {
    const { error, value } = verifyIdentitySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: "Dados inválidos",
        details: error.details.map((d) => d.message),
      });
    }

    const { cpf, nome, data_nascimento } = value;

    const result = await verificationService.verifyIdentity(cpf, nome, data_nascimento);

    res.status(201).json({
      success: true,
      verification: result,
    });
  } catch (error) {
    logger.error('Erro ao solicitar verificação', { error: error.message });
    res.status(500).json({
      error: "Erro ao solicitar verificação",
      message: error.message,
    });
  }
});

/**
 * GET /api/rsv360/verification/status/:requestId
 * Obter status de uma verificação
 */
router.get("/status/:requestId", authenticate, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { db } = require("../config/database");

    const verification = await db("verification_requests")
      .where("id", parseInt(requestId))
      .first();

    if (!verification) {
      return res.status(404).json({
        error: "Verificação não encontrada",
        message: "Nenhuma verificação encontrada com este ID",
      });
    }

    // Verificar se usuário pode acessar (própria verificação ou admin)
    const canAccess = verification.user_id === req.user?.id || req.user?.role === 'admin';
    if (!canAccess) {
      return res.status(403).json({
        error: "Acesso negado",
        message: "Você não tem permissão para acessar esta verificação",
      });
    }

    res.json({
      success: true,
      verification: {
        id: verification.id,
        type: verification.type,
        document: verification.document,
        status: verification.status,
        request_data: verification.request_data ? JSON.parse(verification.request_data) : null,
        response_data: verification.response_data ? JSON.parse(verification.response_data) : null,
        created_at: verification.created_at,
        updated_at: verification.updated_at,
      },
    });
  } catch (error) {
    logger.error('Erro ao obter status da verificação', { error: error.message });
    res.status(500).json({
      error: "Erro ao obter status da verificação",
      message: error.message,
    });
  }
});

/**
 * POST /api/rsv360/verification/upload-document
 * Fazer upload de documento para verificação
 */
router.post("/upload-document", authenticate, async (req, res) => {
  try {
    const { error, value } = uploadDocumentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: "Dados inválidos",
        details: error.details.map((d) => d.message),
      });
    }

    const { document_type, document_number, file_url } = value;

    const { db } = require("../config/database");

    // Salvar documento
    const [document] = await db("verification_documents").insert({
      user_id: req.user.id,
      document_type,
      document_number: document_number.replace(/\D/g, ''), // Remover caracteres não numéricos
      file_url: file_url || null,
      status: 'pending',
      created_at: new Date(),
    }).returning("*");

    res.status(201).json({
      success: true,
      document: {
        id: document.id,
        document_type: document.document_type,
        document_number: document.document_number,
        status: document.status,
        created_at: document.created_at,
      },
      message: "Documento enviado com sucesso. Aguardando verificação.",
    });
  } catch (error) {
    logger.error('Erro ao fazer upload de documento', { error: error.message });
    res.status(500).json({
      error: "Erro ao fazer upload de documento",
      message: error.message,
    });
  }
});

/**
 * POST /api/rsv360/verification/background-check
 * Realizar background check
 */
router.post("/background-check", authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { error, value } = backgroundCheckSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: "Dados inválidos",
        details: error.details.map((d) => d.message),
      });
    }

    const { cpf, nome, data_nascimento } = value;

    const result = await verificationService.performBackgroundCheck(cpf, nome, data_nascimento);

    res.status(201).json({
      success: true,
      background_check: result,
    });
  } catch (error) {
    logger.error('Erro ao realizar background check', { error: error.message });
    res.status(500).json({
      error: "Erro ao realizar background check",
      message: error.message,
    });
  }
});

/**
 * GET /api/rsv360/verification/history/:document
 * Obter histórico de verificações de um documento
 */
router.get("/history/:document", authenticate, async (req, res) => {
  try {
    const { document } = req.params;
    const { type } = req.query;

    const history = await verificationService.getVerificationHistory(document, type || null);

    res.json({
      success: true,
      document: document.replace(/\D/g, ''), // Apenas números
      type: type || 'all',
      history,
      count: history.length,
    });
  } catch (error) {
    logger.error('Erro ao obter histórico de verificações', { error: error.message });
    res.status(500).json({
      error: "Erro ao obter histórico de verificações",
      message: error.message,
    });
  }
});

/**
 * POST /api/rsv360/verification/validate-document
 * Validar documento (CPF ou CNPJ)
 */
router.post("/validate-document", authenticate, async (req, res) => {
  try {
    const { document, type } = req.body;

    if (!document || !type) {
      return res.status(400).json({
        error: "Dados inválidos",
        message: "Forneça 'document' e 'type' (cpf ou cnpj)",
      });
    }

    if (!['cpf', 'cnpj'].includes(type)) {
      return res.status(400).json({
        error: "Tipo inválido",
        message: "Tipo deve ser 'cpf' ou 'cnpj'",
      });
    }

    const result = await verificationService.validateDocument(document, type);

    res.json({
      success: true,
      validation: result,
    });
  } catch (error) {
    logger.error('Erro ao validar documento', { error: error.message });
    res.status(500).json({
      error: "Erro ao validar documento",
      message: error.message,
    });
  }
});

module.exports = router;

