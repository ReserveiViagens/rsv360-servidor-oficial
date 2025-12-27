const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

// Import configurations and utilities
const logger = require("./utils/logger");
const { connectDatabase } = require("./config/database");
const { setupSwagger } = require("./config/swagger");

// Import routes
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const customerRoutes = require("./routes/customers");
const travelPackageRoutes = require("./routes/travel-packages");
const bookingRoutes = require("./routes/bookings");
const paymentRoutes = require("./routes/payments");
const uploadRoutes = require("./routes/uploads");
const analyticsRoutes = require("./routes/analytics");
const workflowRoutes = require("./routes/workflows");
const projectRoutes = require("./routes/projects");
const financialRoutes = require("./routes/financial");
const integrationRoutes = require("./routes/integrations");
const securityRoutes = require("./routes/security");
const performanceRoutes = require("./routes/performance");
const backupRoutes = require("./routes/backup");
const trainingRoutes = require("./routes/training");

// Import RSV360 routes
const bookingsRsv360Routes = require("./routes/bookings-rsv360");
const propertiesRsv360Routes = require("./routes/properties-rsv360");
const paymentsRsv360Routes = require("./routes/payments-rsv360");
const pricingRsv360Routes = require("./routes/pricing-rsv360");
const topHostsRsv360Routes = require("./routes/top-hosts-rsv360");
const crmRsv360Routes = require("./routes/crm-rsv360");
const verificationRsv360Routes = require("./routes/verification-rsv360");
const wishlistsRsv360Routes = require("./routes/wishlists-rsv360");
const splitPaymentsRsv360Routes = require("./routes/split-payments-rsv360");
const tripInvitationsRsv360Routes = require("./routes/trip-invitations-rsv360");
const groupChatsRsv360Routes = require("./routes/group-chats-rsv360");
const auctionsRsv360Routes = require("./routes/auctions-rsv360");
const googleCalendarRsv360Routes = require("./routes/integrations/google-calendar-rsv360");
const smartLocksRsv360Routes = require("./routes/integrations/smart-locks-rsv360");
const klarnaRsv360Routes = require("./routes/integrations/klarna-rsv360");
const notificationsRsv360Routes = require("./routes/notifications-rsv360");
const blogRsv360Routes = require("./routes/blog-rsv360");
const contactRsv360Routes = require("./routes/contact-rsv360");
const dashboardRsv360Routes = require("./routes/dashboard-rsv360");
const marketingRsv360Routes = require("./routes/marketing-rsv360");
const financialRsv360Routes = require("./routes/financial-rsv360");
const quotationsRsv360Routes = require("./routes/quotations-rsv360");

// Import middleware
const errorHandler = require("./middleware/errorHandler");
const { authenticateToken } = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
  }),
);

// Rate limiting
const limiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests from this IP, please try again later.",
    code: "RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// CORS configuration
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.FRONTEND_URL
        : ["http://localhost:3000", "http://localhost:3001"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV !== "test") {
  app.use(
    morgan("combined", {
      stream: { write: (message) => logger.info(message.trim()) },
    }),
  );
}

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Static files
app.use("/uploads", express.static("uploads"));

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || "1.0.0",
    environment: process.env.NODE_ENV || "development",
  });
});

// API Documentation
if (process.env.API_DOCS_ENABLED === "true") {
  setupSwagger(app);
}

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", authenticateToken, userRoutes);
app.use("/api/customers", authenticateToken, customerRoutes);
app.use("/api/travel-packages", authenticateToken, travelPackageRoutes);
app.use("/api/bookings", authenticateToken, bookingRoutes);
app.use("/api/payments", authenticateToken, paymentRoutes);
app.use("/api/uploads", authenticateToken, uploadRoutes);
app.use("/api/analytics", authenticateToken, analyticsRoutes);
app.use("/api/workflows", authenticateToken, workflowRoutes);
app.use("/api/projects", authenticateToken, projectRoutes);
app.use("/api/financial", authenticateToken, financialRoutes);
app.use("/api/integrations", authenticateToken, integrationRoutes);
app.use("/api/security", authenticateToken, securityRoutes);
app.use("/api/performance", authenticateToken, performanceRoutes);
app.use("/api/backup", authenticateToken, backupRoutes);
app.use("/api/training", authenticateToken, trainingRoutes);

// RSV360 Routes
app.use("/api/rsv360/bookings", authenticateToken, bookingsRsv360Routes);
// Properties: algumas rotas são públicas (GET /), outras requerem autenticação (POST, PUT, DELETE, /my)
app.use("/api/rsv360/properties", propertiesRsv360Routes);
app.use("/api/rsv360/payments", authenticateToken, paymentsRsv360Routes);
app.use("/api/rsv360/pricing", authenticateToken, pricingRsv360Routes);
app.use("/api/rsv360/top-hosts", authenticateToken, topHostsRsv360Routes);
app.use("/api/rsv360/crm", authenticateToken, crmRsv360Routes);
app.use("/api/rsv360/verification", authenticateToken, verificationRsv360Routes);
app.use("/api/rsv360/wishlists", authenticateToken, wishlistsRsv360Routes);
app.use("/api/rsv360/split-payments", authenticateToken, splitPaymentsRsv360Routes);
app.use("/api/rsv360/trip-invitations", authenticateToken, tripInvitationsRsv360Routes);
app.use("/api/rsv360/group-chats", authenticateToken, groupChatsRsv360Routes);
app.use("/api/rsv360/auctions", authenticateToken, auctionsRsv360Routes); // Leilões de hospedagem
app.use("/api/rsv360/integrations/google-calendar", authenticateToken, googleCalendarRsv360Routes);
app.use("/api/rsv360/integrations/smart-locks", authenticateToken, smartLocksRsv360Routes);
app.use("/api/rsv360/integrations/klarna", authenticateToken, klarnaRsv360Routes);
app.use("/api/rsv360/notifications", authenticateToken, notificationsRsv360Routes);
app.use("/api/rsv360/blog", blogRsv360Routes); // Público (apenas GET), admin para POST/PUT/DELETE
app.use("/api/rsv360/contact", contactRsv360Routes); // Público para POST, admin para GET/PUT
app.use("/api/rsv360/dashboard", authenticateToken, dashboardRsv360Routes); // Autenticado
app.use("/api/rsv360/marketing", authenticateToken, marketingRsv360Routes); // Autenticado, admin/marketing para POST/PUT/DELETE
app.use("/api/rsv360/financial", authenticateToken, financialRsv360Routes); // Autenticado, admin/financeiro para POST/PUT/DELETE
app.use("/api/rsv360/quotations", authenticateToken, quotationsRsv360Routes); // Autenticado

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "RSV 360 Backend API",
    version: "1.0.0",
    status: "running",
    timestamp: new Date().toISOString(),
    endpoints: {
      health: "/health",
      api: "/api",
      admin: "/api/admin",
      website: "/api/website",
    },
  });
});

// API base route
app.get("/api", (req, res) => {
  res.json({
    message: "Onboarding RSV API",
    version: "1.0.0",
    documentation:
      process.env.API_DOCS_ENABLED === "true"
        ? "/api-docs"
        : "Documentation disabled",
    endpoints: {
      auth: "/api/auth",
      users: "/api/users",
      bookings: "/api/bookings",
      payments: "/api/payments",
      uploads: "/api/uploads",
      analytics: "/api/analytics",
      workflows: "/api/workflows",
      projects: "/api/projects",
      financial: "/api/financial",
      integrations: "/api/integrations",
      security: "/api/security",
      performance: "/api/performance",
      backup: "/api/backup",
      training: "/api/training",
      rsv360: {
        bookings: "/api/rsv360/bookings",
        properties: "/api/rsv360/properties",
        payments: "/api/rsv360/payments",
        pricing: "/api/rsv360/pricing",
        topHosts: "/api/rsv360/top-hosts",
        crm: "/api/rsv360/crm",
        verification: "/api/rsv360/verification",
        wishlists: "/api/rsv360/wishlists",
        splitPayments: "/api/rsv360/split-payments",
        tripInvitations: "/api/rsv360/trip-invitations",
        groupChats: "/api/rsv360/group-chats",
        auctions: "/api/rsv360/auctions",
      },
    },
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    message: `The requested route ${req.originalUrl} does not exist`,
    code: "ROUTE_NOT_FOUND",
  });
});

// Error handling middleware (should be last)
app.use(errorHandler);

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received. Shutting down gracefully...");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT received. Shutting down gracefully...");
  process.exit(0);
});

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();

    // Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
      logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
      if (process.env.API_DOCS_ENABLED === "true") {
        logger.info(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      }
    });

    // Initialize WebSocket
    const { initializeWebSocket } = require("./utils/websocket");
    const io = initializeWebSocket(server);
    logger.info(`🔌 WebSocket server initialized on port ${PORT}`);

    // Initialize Auction Status Job
    // NOTE: Jobs serão movidos para apps/jobs/ na Fase 3.4
    // const { startAuctionStatusJob } = require("./jobs/auctionStatusJob");
    // startAuctionStatusJob();
    // logger.info(`⏰ Auction status job started (runs every minute)`);

    // Handle server errors
    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        logger.error(`Port ${PORT} is already in use`);
      } else {
        logger.error("Server error:", error);
      }
      process.exit(1);
    });

    return { server, io };
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
