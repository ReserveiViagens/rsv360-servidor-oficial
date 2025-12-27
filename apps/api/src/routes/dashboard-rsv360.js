/**
 * 📊 Dashboard RSV360 Routes
 * FASE: Rotas para estatísticas do dashboard
 */

const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { advancedJWTValidation } = require("../middleware/advancedAuth");
const { createLogger } = require("../utils/logger");

const logger = createLogger({ service: 'dashboardRoutes' });
const authenticate = advancedJWTValidation;

/**
 * GET /api/rsv360/dashboard/stats
 * Obter estatísticas do dashboard (reservas, receita, clientes, etc)
 */
router.get("/stats", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Calcular período do mês atual
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    let stats;

    if (userRole === 'admin' || userRole === 'manager') {
      // Estatísticas globais para admin/manager
      const [totalBookings] = await db("bookings")
        .count("* as count")
        .first();

      const [monthlyBookings] = await db("bookings")
        .whereBetween("created_at", [startOfMonth, endOfMonth])
        .count("* as count")
        .first();

      const [monthlyRevenue] = await db("payments")
        .where("status", "completed")
        .whereBetween("created_at", [startOfMonth, endOfMonth])
        .sum("amount as total")
        .first();

      const [activeCustomers] = await db("customers")
        .where("status", "active")
        .count("* as count")
        .first();

      // Destino mais popular (baseado em bookings)
      const [popularDestination] = await db("bookings")
        .join("properties", "bookings.property_id", "properties.id")
        .select("properties.address_city as destination")
        .count("* as count")
        .groupBy("properties.address_city")
        .orderBy("count", "desc")
        .limit(1)
        .first();

      // Taxa de conversão (bookings confirmados / total de visualizações - aproximado)
      const [confirmedBookings] = await db("bookings")
        .where("status", "confirmed")
        .whereBetween("created_at", [startOfMonth, endOfMonth])
        .count("* as count")
        .first();

      // Valor médio de reserva
      const [avgBookingValue] = await db("bookings")
        .where("status", "confirmed")
        .whereBetween("created_at", [startOfMonth, endOfMonth])
        .avg("total_amount as avg")
        .first();

      stats = {
        totalBookings: parseInt(totalBookings?.count || 0),
        monthlyRevenue: parseFloat(monthlyRevenue?.total || 0),
        activeCustomers: parseInt(activeCustomers?.count || 0),
        popularDestination: popularDestination?.destination || 'N/A',
        conversionRate: 12.5, // Placeholder - precisa de tracking de visualizações
        averageBookingValue: parseFloat(avgBookingValue?.avg || 0),
      };
    } else {
      // Estatísticas do usuário (host/agente)
      const [userBookings] = await db("bookings")
        .join("properties", "bookings.property_id", "properties.id")
        .where("properties.owner_id", userId)
        .count("* as count")
        .first();

      const [userMonthlyBookings] = await db("bookings")
        .join("properties", "bookings.property_id", "properties.id")
        .where("properties.owner_id", userId)
        .whereBetween("bookings.created_at", [startOfMonth, endOfMonth])
        .count("* as count")
        .first();

      const [userMonthlyRevenue] = await db("payments")
        .join("bookings", "payments.booking_id", "bookings.id")
        .join("properties", "bookings.property_id", "properties.id")
        .where("properties.owner_id", userId)
        .where("payments.status", "completed")
        .whereBetween("payments.created_at", [startOfMonth, endOfMonth])
        .sum("payments.amount as total")
        .first();

      stats = {
        totalBookings: parseInt(userBookings?.count || 0),
        monthlyRevenue: parseFloat(userMonthlyRevenue?.total || 0),
        activeCustomers: 0, // Não aplicável para hosts
        popularDestination: 'N/A',
        conversionRate: 0,
        averageBookingValue: 0,
      };
    }

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    logger.error('Erro ao obter estatísticas do dashboard', { userId: req.user.id, error: error.message });
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

/**
 * GET /api/rsv360/dashboard/recent-bookings
 * Obter reservas recentes para o dashboard
 */
router.get("/recent-bookings", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { limit = 10 } = req.query;

    let query = db("bookings")
      .select(
        "bookings.id",
        "bookings.check_in",
        "bookings.check_out",
        "bookings.total_amount as value",
        "bookings.status",
        "customers.full_name as customerName",
        "properties.title as destination",
        "payments.status as paymentStatus"
      )
      .leftJoin("customers", "bookings.customer_id", "customers.id")
      .leftJoin("properties", "bookings.property_id", "properties.id")
      .leftJoin("payments", "bookings.id", "payments.booking_id")
      .orderBy("bookings.created_at", "desc")
      .limit(parseInt(limit));

    // Filtrar por owner se não for admin
    if (userRole !== 'admin' && userRole !== 'manager') {
      query = query.join("properties", "bookings.property_id", "properties.id")
        .where("properties.owner_id", userId);
    }

    const bookings = await query;

    const formattedBookings = bookings.map(booking => ({
      id: booking.id.toString(),
      customerName: booking.customerName || 'Cliente não informado',
      destination: booking.destination || 'Destino não informado',
      checkIn: booking.check_in,
      checkOut: booking.check_out,
      value: parseFloat(booking.value || 0),
      status: booking.status || 'pending',
      paymentStatus: booking.paymentStatus || 'pending',
    }));

    res.json({
      success: true,
      bookings: formattedBookings,
    });
  } catch (error) {
    logger.error('Erro ao obter reservas recentes', { userId: req.user.id, error: error.message });
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

module.exports = router;

