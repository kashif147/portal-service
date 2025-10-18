var path = require("path");
const envFile =
  process.env.NODE_ENV === "staging" ? ".env.staging" : ".env.development";
require("dotenv").config({ path: envFile });

var createError = require("http-errors");
var express = require("express");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const { corsMiddleware, corsErrorHandler } = require("./config/cors");

const { mongooseConnection } = require("./config/db");
const session = require("express-session");

const loggerMiddleware = require("./middlewares/logger.mw");
const responseMiddleware = require("./middlewares/response.mw");
const { defaultPolicyMiddleware } = require("./middlewares/policy.middleware");

// require("message-bus/src/index");

var app = express();

// Trust proxy for secure cookies
app.set("trust proxy", 1);

app.use(responseMiddleware);

mongooseConnection();

// Initialize RabbitMQ event system (non-blocking) - Now using middleware
const {
  initEventSystem,
  setupConsumers,
  shutdownEventSystem,
} = require("./rabbitMQ");

// Only initialize RabbitMQ if URL is configured
if (process.env.RABBIT_URL) {
  console.log("🐰 RabbitMQ URL configured, initializing with middleware...");
  initEventSystem()
    .then(() => {
      console.log("✅ Initializing RabbitMQ consumers...");
      return setupConsumers();
    })
    .then(() => {
      console.log("✅ RabbitMQ fully initialized with middleware");
    })
    .catch((error) => {
      console.error("❌ Failed to initialize RabbitMQ:", error.message);
      console.error("⚠️ App will continue without RabbitMQ (degraded mode)");
    });

  // Graceful shutdown
  process.on("SIGTERM", async () => {
    console.log("⏹️  SIGTERM received, shutting down gracefully...");
    await shutdownEventSystem();
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    console.log("⏹️  SIGINT received, shutting down gracefully...");
    await shutdownEventSystem();
    process.exit(0);
  });
} else {
  console.warn(
    "⚠️ RABBIT_URL not configured, skipping RabbitMQ initialization"
  );
}

app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: "200mb" }));

// Security middleware
app.use(helmet());

// Cookie parser
app.use(cookieParser());

app.use(loggerMiddleware);

app.use(corsMiddleware);

app.use(
  session({
    secret: "secret2024",
    resave: false,
    saveUninitialized: false,
  })
);

// Error handling for policy service failures
app.use((err, req, res, next) => {
  if (err.isPolicyError) {
    console.error("Policy service error:", err.message);
    return res.status(503).json({ error: "Service Unavailable" });
  }
  next(err);
});

app.set("view engine", "ejs");

app.use(express.static("public"));

// Public routes (no auth required)
app.get("/", (req, res) => {
  res.render("index", { title: "Portal Service" });
});

// Health check endpoint (no auth required)
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "portal-service",
    timestamp: new Date().toISOString(),
    port: process.env.PORT || 4000,
    environment: process.env.NODE_ENV || "development",
  });
});

// API documentation endpoint (no auth required)
app.get("/api", (req, res) => {
  res.json({
    service: "Portal Service API",
    version: "1.0.0",
    endpoints: {
      health: "GET /health",
      personalDetails: "GET /api/personal-details (auth required)",
      professionalDetails: "GET /api/professional-details (auth required)",
      subscriptionDetails: "GET /api/subscription-details (auth required)",
      applications: "GET /api/applications (auth required)",
    },
    authentication:
      "Bearer token required for all endpoints except /health and /api",
  });
});

// Auth routes (no authentication required)
app.use("/auth", require("./routes/auth.routes"));

// API routes (authentication handled by policy middleware in individual routes)
app.use("/api", require("./routes/index"));

app.use(function (req, res, next) {
  next(createError(404));
});

app.use(corsErrorHandler);
app.use(responseMiddleware.errorHandler);

module.exports = app;
