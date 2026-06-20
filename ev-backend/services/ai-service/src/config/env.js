import dotenv from "dotenv";

dotenv.config();

const parseOrigins = (value) =>
  value
    ? value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
    : ["*"];

const parseNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const env = {
  port: parseNumber(process.env.PORT, 8008),
  nodeEnv: process.env.NODE_ENV || "development",
  allowedOrigins: parseOrigins(process.env.ALLOWED_ORIGINS),
  awsRegion: process.env.AWS_REGION || "us-east-1",
  bedrockModelId: process.env.BEDROCK_MODEL_ID || "anthropic.claude-3-5-sonnet-20240620-v1:0",
  bedrockMaxTokens: parseNumber(process.env.BEDROCK_MAX_TOKENS, 1200),
  bedrockTemperature: parseNumber(process.env.BEDROCK_TEMPERATURE, 0.2),
  reportsBucketName: process.env.REPORTS_BUCKET_NAME || "",
  mongoUri: process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://127.0.0.1:27020/ev-ai-service",
  mongodbSecretId: process.env.MONGODB_SECRET_ID || "",
  userServiceUrl: process.env.USER_SERVICE_URL || "http://localhost:8002",
  stationServiceUrl: process.env.STATION_SERVICE_URL || "http://localhost:8003",
  bookingServiceUrl: process.env.BOOKING_SERVICE_URL || "http://localhost:8004",
  paymentServiceUrl: process.env.PAYMENT_SERVICE_URL || "http://localhost:8005",
  reviewServiceUrl: process.env.REVIEW_SERVICE_URL || "http://localhost:8006",
  adminServiceUrl: process.env.ADMIN_SERVICE_URL || "http://localhost:8007",
  requestTimeoutMs: parseNumber(process.env.SERVICE_REQUEST_TIMEOUT_MS, 10000),
  memoryLimit: parseNumber(process.env.CHAT_MEMORY_LIMIT, 8)
};
