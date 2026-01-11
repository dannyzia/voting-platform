import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from "./routes/auth";
import electionRoutes from "./routes/elections";
import voteRoutes from "./routes/vote";
import adminRoutes from "./routes/admin";
import resultsRoutes from "./routes/results";

// Import middleware
import { apiRateLimiter } from "./middleware/rateLimiter";

// Initialize Prisma
export const prisma = new PrismaClient();

// Create Express app
const app: Application = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: [
          "'self'",
          process.env.FRONTEND_URL || "http://localhost:5173",
        ],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }),
);

// CORS configuration for production deployment
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:5173", "https://your-frontend.vercel.app"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Session-Token"],
  }),
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

// Redis-based rate limiting for API routes
app.use("/api/", apiRateLimiter);

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "voting-api",
  });
});

// Comprehensive health check
app.get("/api/v1/health", async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();

    // Check database connection
    let dbStatus = "unknown";
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = "connected";
    } catch (error) {
      dbStatus = "disconnected";
    }

    // Check Redis connection
    let redisStatus = "unknown";
    try {
      await redisService.ping();
      redisStatus = "connected";
    } catch (error) {
      redisStatus = "disconnected";
    }

    // Check WebSocket connection
    const wsStatus = wsService.isConnected() ? "connected" : "disconnected";

    const responseTime = Date.now() - startTime;

    const healthStatus = {
      status:
        dbStatus === "connected" && redisStatus === "connected"
          ? "healthy"
          : "unhealthy",
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      services: {
        database: dbStatus,
        redis: redisStatus,
        websocket: wsStatus,
      },
      environment: process.env.NODE_ENV || "development",
      version: process.env.npm_package_version || "1.0.0",
    };

    if (healthStatus.status === "healthy") {
      res.json(healthStatus);
    } else {
      res.status(503).json(healthStatus);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      status: "error",
      error: message,
      timestamp: new Date().toISOString(),
    });
  }
});

// API Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/elections", electionRoutes);
app.use("/api/v1/vote", voteRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/results", resultsRoutes);

// Device verification endpoint (main entry point for voters)
app.use("/api/v1/verify-device", voteRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Error:", err.message);
  res.status(500).json({
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal server error",
  });
});

// Graceful shutdown
async function shutdown() {
  console.log("Shutting down gracefully...");
  await redisService.disconnect();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// WebSocket service
import { createServer } from "http";
import { wsService } from "./services/websocket";
import { redisService } from "./services/redisService";

// Start server
async function main() {
  try {
    await prisma.$connect();
    console.log("Connected to database");

    // Connect to Redis (optional, continue without it if unavailable)
    try {
      await redisService.connect();
      if (redisService.isReady()) {
        console.log("Redis connected successfully");
      } else {
        console.log("Running without Redis - some features may be limited");
      }
    } catch (error) {
      console.warn("Redis connection failed, continuing without it:", error);
    }

    // Create HTTP server for Express + WebSocket
    const server = createServer(app);

    // Initialize WebSocket
    wsService.initialize(server);

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`WebSocket available at ws://localhost:${PORT}/ws`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

main();
