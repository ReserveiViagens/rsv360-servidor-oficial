/**
 * 💼 Financial API Routes
 * FASE: Rotas para transações financeiras
 */

const express = require("express");
const Joi = require("joi");
const router = express.Router();
const { db } = require("../config/database");
const { advancedJWTValidation, requireRole } = require("../middleware/advancedAuth");
const { createLogger } = require("../utils/logger");

const logger = createLogger({ service: 'financialRoutes' });
const authenticate = advancedJWTValidation;

// Schema de validação
const createTransactionSchema = Joi.object({
  type: Joi.string().valid("income", "expense").required(),
  category: Joi.string().min(2).max(100).required(),
  description: Joi.string().min(3).max(500).required(),
  amount: Joi.number().min(0.01).required(),
  date: Joi.date().iso().required(),
  payment_method: Joi.string().max(100).optional(),
  status: Joi.string().valid("completed", "pending", "cancelled").optional(),
  reference: Joi.string().max(100).optional(),
  customer_id: Joi.number().integer().optional(),
  booking_id: Joi.number().integer().optional(),
  payment_id: Joi.number().integer().optional(),
  notes: Joi.string().max(1000).optional(),
  metadata: Joi.object().optional(),
});

const updateTransactionSchema = Joi.object({
  category: Joi.string().min(2).max(100).optional(),
  description: Joi.string().min(3).max(500).optional(),
  amount: Joi.number().min(0.01).optional(),
  date: Joi.date().iso().optional(),
  payment_method: Joi.string().max(100).optional(),
  status: Joi.string().valid("completed", "pending", "cancelled").optional(),
  reference: Joi.string().max(100).optional(),
  notes: Joi.string().max(1000).optional(),
  metadata: Joi.object().optional(),
});

/**
 * GET /api/rsv360/financial/transactions
 * Listar transações financeiras
 */
router.get("/transactions", authenticate, async (req, res) => {
  try {
    const { type, status, category, page = 1, limit = 20, period } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    let query = db("financial_transactions")
      .select(
        "financial_transactions.*",
        "customers.full_name as customerName"
      )
      .leftJoin("customers", "financial_transactions.customer_id", "customers.id");

    // Filtrar por tipo
    if (type && type !== 'all') {
      query = query.where("financial_transactions.type", type);
    }

    // Filtrar por status
    if (status && status !== 'all') {
      query = query.where("financial_transactions.status", status);
    }

    // Filtrar por categoria
    if (category) {
      query = query.where("financial_transactions.category", category);
    }

    // Filtrar por período
    if (period && period !== 'all') {
      const now = new Date();
      let startDate;
      
      switch (period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'quarter':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = null;
      }

      if (startDate) {
        query = query.where("financial_transactions.date", ">=", startDate.toISOString().split('T')[0]);
      }
    }

    // Se não for admin, filtrar apenas transações do usuário (se houver relacionamento)
    // Por enquanto, todos os usuários autenticados podem ver todas as transações
    // (pode ser ajustado conforme regra de negócio)

    // Contar total
    const totalQuery = query.clone();
    const [{ count }] = await totalQuery.count("* as count");
    const total = parseInt(count);

    // Paginação
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const transactions = await query
      .orderBy("financial_transactions.date", "desc")
      .orderBy("financial_transactions.created_at", "desc")
      .limit(parseInt(limit))
      .offset(offset);

    // Formatar transações
    const formattedTransactions = transactions.map(t => ({
      id: t.id,
      type: t.type,
      category: t.category,
      description: t.description,
      amount: parseFloat(t.amount),
      date: t.date,
      paymentMethod: t.payment_method,
      status: t.status,
      reference: t.reference,
      customer: t.customerName || 'Sistema',
      notes: t.notes,
      metadata: typeof t.metadata === 'string' ? JSON.parse(t.metadata || '{}') : (t.metadata || {}),
    }));

    res.json({
      transactions: formattedTransactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error('Erro ao listar transações financeiras', { userId: req.user.id, error: error.message });
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

/**
 * GET /api/rsv360/financial/transactions/:id
 * Obter transação específica
 */
router.get("/transactions/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await db("financial_transactions")
      .select(
        "financial_transactions.*",
        "customers.full_name as customerName"
      )
      .leftJoin("customers", "financial_transactions.customer_id", "customers.id")
      .where("financial_transactions.id", parseInt(id))
      .first();

    if (!transaction) {
      return res.status(404).json({ error: "Transação não encontrada" });
    }

    const formattedTransaction = {
      id: transaction.id,
      type: transaction.type,
      category: transaction.category,
      description: transaction.description,
      amount: parseFloat(transaction.amount),
      date: transaction.date,
      paymentMethod: transaction.payment_method,
      status: transaction.status,
      reference: transaction.reference,
      customer: transaction.customerName || 'Sistema',
      notes: transaction.notes,
      metadata: typeof transaction.metadata === 'string' ? JSON.parse(transaction.metadata || '{}') : (transaction.metadata || {}),
    };

    res.json(formattedTransaction);
  } catch (error) {
    logger.error('Erro ao obter transação', { id: req.params.id, error: error.message });
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

/**
 * POST /api/rsv360/financial/transactions
 * Criar nova transação (apenas admin/financeiro)
 */
router.post("/transactions", authenticate, requireRole(['admin', 'financeiro']), async (req, res) => {
  try {
    const { error, value } = createTransactionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: "Dados inválidos", 
        details: error.details.map(d => d.message) 
      });
    }

    const [transaction] = await db("financial_transactions")
      .insert({
        ...value,
        created_by: req.user.id,
        metadata: value.metadata ? JSON.stringify(value.metadata) : null,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      })
      .returning("*");

    // Buscar nome do cliente se houver
    let customerName = 'Sistema';
    if (transaction.customer_id) {
      const customer = await db("customers")
        .where("id", transaction.customer_id)
        .select("full_name")
        .first();
      if (customer) {
        customerName = customer.full_name;
      }
    }

    const formattedTransaction = {
      id: transaction.id,
      type: transaction.type,
      category: transaction.category,
      description: transaction.description,
      amount: parseFloat(transaction.amount),
      date: transaction.date,
      paymentMethod: transaction.payment_method,
      status: transaction.status,
      reference: transaction.reference,
      customer: customerName,
      notes: transaction.notes,
      metadata: typeof transaction.metadata === 'string' ? JSON.parse(transaction.metadata || '{}') : (transaction.metadata || {}),
    };

    res.status(201).json(formattedTransaction);
  } catch (error) {
    logger.error('Erro ao criar transação', { body: req.body, error: error.message });
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

/**
 * PUT /api/rsv360/financial/transactions/:id
 * Atualizar transação (apenas admin/financeiro)
 */
router.put("/transactions/:id", authenticate, requireRole(['admin', 'financeiro']), async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = updateTransactionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: "Dados inválidos", 
        details: error.details.map(d => d.message) 
      });
    }

    const updateData = { ...value };
    if (updateData.metadata) {
      updateData.metadata = JSON.stringify(updateData.metadata);
    }
    updateData.updated_at = db.fn.now();

    const [transaction] = await db("financial_transactions")
      .where({ id: parseInt(id) })
      .update(updateData)
      .returning("*");

    if (!transaction) {
      return res.status(404).json({ error: "Transação não encontrada" });
    }

    // Buscar nome do cliente se houver
    let customerName = 'Sistema';
    if (transaction.customer_id) {
      const customer = await db("customers")
        .where("id", transaction.customer_id)
        .select("full_name")
        .first();
      if (customer) {
        customerName = customer.full_name;
      }
    }

    const formattedTransaction = {
      id: transaction.id,
      type: transaction.type,
      category: transaction.category,
      description: transaction.description,
      amount: parseFloat(transaction.amount),
      date: transaction.date,
      paymentMethod: transaction.payment_method,
      status: transaction.status,
      reference: transaction.reference,
      customer: customerName,
      notes: transaction.notes,
      metadata: typeof transaction.metadata === 'string' ? JSON.parse(transaction.metadata || '{}') : (transaction.metadata || {}),
    };

    res.json(formattedTransaction);
  } catch (error) {
    logger.error('Erro ao atualizar transação', { id: req.params.id, error: error.message });
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

/**
 * DELETE /api/rsv360/financial/transactions/:id
 * Deletar transação (apenas admin/financeiro)
 */
router.delete("/transactions/:id", authenticate, requireRole(['admin', 'financeiro']), async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await db("financial_transactions")
      .where({ id: parseInt(id) })
      .del();

    if (deleted === 0) {
      return res.status(404).json({ error: "Transação não encontrada" });
    }

    res.json({ message: "Transação deletada com sucesso" });
  } catch (error) {
    logger.error('Erro ao deletar transação', { id: req.params.id, error: error.message });
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

/**
 * GET /api/rsv360/financial/metrics
 * Obter métricas financeiras agregadas
 */
router.get("/metrics", authenticate, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Calcular período
    const now = new Date();
    let startDate;
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default: // month
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const dateStr = startDate.toISOString().split('T')[0];

    // Calcular métricas
    const [totalIncome] = await db("financial_transactions")
      .where("type", "income")
      .where("status", "completed")
      .where("date", ">=", dateStr)
      .sum("amount as total")
      .first();

    const [totalExpenses] = await db("financial_transactions")
      .where("type", "expense")
      .where("status", "completed")
      .where("date", ">=", dateStr)
      .sum("amount as total")
      .first();

    const [totalTransactions] = await db("financial_transactions")
      .where("date", ">=", dateStr)
      .count("* as count")
      .first();

    const netProfit = parseFloat(totalIncome?.total || 0) - parseFloat(totalExpenses?.total || 0);
    const profitMargin = parseFloat(totalIncome?.total || 0) > 0 
      ? (netProfit / parseFloat(totalIncome?.total || 0)) * 100 
      : 0;

    res.json({
      totalIncome: parseFloat(totalIncome?.total || 0),
      totalExpenses: parseFloat(totalExpenses?.total || 0),
      netProfit,
      profitMargin: parseFloat(profitMargin.toFixed(2)),
      totalTransactions: parseInt(totalTransactions?.count || 0),
    });
  } catch (error) {
    logger.error('Erro ao obter métricas financeiras', { userId: req.user.id, error: error.message });
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

module.exports = router;

