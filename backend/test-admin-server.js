/**
 * 🧠 CHAIN OF THOUGHT: Servidor de teste para APIs Administrativas CRUD
 * 🦴 SKELETON OF THOUGHT: Express + Admin Routes + CORS + Error Handling
 * 🌳 TREE OF THOUGHT: Teste completo das operações CRUD
 * ✅ SELF CONSISTENCY: Validação de todas as funcionalidades
 */

const express = require("express");
const cors = require("cors");
const path = require("path");
const adminWebsiteRoutes = require("./src/routes/admin-website");
const websiteRoutes = require("./src/routes/website-real");
const uploadRoutes = require("./src/routes/upload");

const app = express();
const PORT = Number(process.env.PORT || 5002);

// 🔧 Middleware
// CORS dinâmico para ambientes de desenvolvimento
const allowedOrigins = new Set([
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:3015",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "http://127.0.0.1:3002",
  "http://127.0.0.1:3015",
]);

app.use(
  cors({
    origin: (origin, callback) => {
      // Permite ferramentas como Postman (sem origin)
      if (!origin) return callback(null, true);

      try {
        const url = new URL(origin);
        const host = url.hostname;
        const port = url.port;

        // Permite localhost/127.0.0.1 nas portas 3000-3020
        if (
          (host === "localhost" || host === "127.0.0.1") &&
          /^30\d{2}$/.test(port)
        ) {
          return callback(null, true);
        }

        // Permite IPs locais (ex.: 172.x.x.x, 192.168.x.x) nas portas 3000-3020
        const isPrivateIp =
          host.startsWith("172.") ||
          host.startsWith("192.168.") ||
          host.startsWith("10.") ||
          host === "host.docker.internal";
        if (isPrivateIp && /^30\d{2}$/.test(port)) {
          return callback(null, true);
        }

        // Fallback para lista explícita
        if (allowedOrigins.has(origin)) {
          return callback(null, true);
        }

        return callback(new Error(`Origin não permitida pelo CORS: ${origin}`));
      } catch (e) {
        return callback(new Error("Origin inválida"));
      }
    },
    credentials: true,
  }),
);

// Responder pré-flight rapidamente
app.options("*", cors());

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// 📊 Logs de requisições estruturados
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const log = {
      level: "info",
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Date.now() - start,
      ip: req.ip,
      ua: req.headers["user-agent"],
    };
    console.log(JSON.stringify(log));
  });
  next();
});

// 🏥 Health check
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    message: "APIs Administrativas CRUD funcionando!",
    timestamp: new Date().toISOString(),
    port: PORT,
  });
});

// 🚀 RSV Onboarding 360 API
app.get("/api/onboarding/status", (req, res) => {
  res.status(200).json({
    service: "RSV Onboarding 360",
    status: "active",
    version: "1.0.0",
    features: [
      "BMAD Method Training",
      "Agent Certification",
      "Performance Analytics",
      "Automated Workflows",
    ],
    endpoints: {
      training: "/api/onboarding/training",
      progress: "/api/onboarding/progress",
      certification: "/api/onboarding/certification",
    },
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/onboarding/training", (req, res) => {
  res.status(200).json({
    modules: [
      {
        id: "bmad-basics",
        title: "BMAD Method Fundamentals",
        description: "Fundamentos do método BMAD para turismo",
        duration: "45 min",
        status: "available",
      },
      {
        id: "customer-service",
        title: "Atendimento ao Cliente",
        description: "Técnicas avançadas de atendimento",
        duration: "60 min",
        status: "available",
      },
      {
        id: "sales-techniques",
        title: "Técnicas de Vendas",
        description: "Estratégias de vendas para turismo",
        duration: "90 min",
        status: "available",
      },
    ],
    total_modules: 3,
    estimated_completion: "3-4 hours",
  });
});

app.get("/api/onboarding/progress/:agentId", (req, res) => {
  const { agentId } = req.params;
  res.status(200).json({
    agent_id: agentId,
    overall_progress: 75,
    completed_modules: 2,
    total_modules: 3,
    certification_status: "in_progress",
    last_activity: new Date().toISOString(),
    next_module: "sales-techniques",
  });
});

// 📋 Rotas administrativas
app.use("/api/admin/website", adminWebsiteRoutes);

// 🌐 Rotas públicas do website (consumidas pelo frontend)
app.use("/api/website", websiteRoutes);

// 📁 Rotas de upload
app.use("/api/upload", uploadRoutes);

// 📁 Servir arquivos estáticos (uploads)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// 🚀 Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor Admin APIs rodando na porta ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(
    `🔐 Admin APIs: http://localhost:${PORT}/api/admin/website/content`,
  );
  console.log(`🔑 Token de teste: admin-token-123`);
  console.log(`📝 Exemplo de uso:`);
  console.log(
    `   curl -H "Authorization: Bearer admin-token-123" http://localhost:${PORT}/api/admin/website/content`,
  );
});

// ✅ SELF CONSISTENCY: Error handling global
app.use((err, req, res, next) => {
  console.error("❌ Erro global:", err.message);
  res.status(500).json({
    success: false,
    error: "Erro interno do servidor",
    message: err.message,
  });
});

module.exports = app;
