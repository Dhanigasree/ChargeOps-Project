import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import { connectDatabase } from "./src/config/database.js";
import { env } from "./src/config/env.js";
import { logger } from "./src/config/logger.js";
import { errorHandler, notFoundHandler } from "./src/middleware/errorHandler.js";
import aiRoutes from "./src/routes/aiRoutes.js";

const app = express();

const corsOptions = {
  origin(origin, callback) {
    if (!origin || env.allowedOrigins.includes("*") || env.allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("CORS policy violation"));
  },
  credentials: true
};

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.nodeEnv === "production" ? 120 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many AI requests, please try again later"
  }
});

app.use(helmet());
app.use(cors(corsOptions));
app.use(limiter);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "AI service is healthy"
  });
});

app.use("/api/ai", aiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const startServer = async () => {
  try {
    await connectDatabase();
  } catch (error) {
    logger.error({ err: error }, "AI service MongoDB connection error");
  }

  app.listen(env.port, "0.0.0.0", () => {
    logger.info({ port: env.port }, "AI service listening");
  });
};

startServer().catch((error) => {
  logger.fatal({ err: error }, "Failed to start AI service");
  process.exit(1);
});
