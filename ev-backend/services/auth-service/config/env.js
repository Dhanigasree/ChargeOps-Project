import dotenv from "dotenv";

dotenv.config();

const parseOrigins = (value) =>
  value
    ? value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
    : ["*"];

export const env = {
  port: Number(process.env.PORT) || 8001,
  nodeEnv: process.env.NODE_ENV || "development",
  mongoUri: process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL || "mongodb://127.0.0.1:27018/ev-auth-service",
  mongoUriSource: process.env.MONGO_URI
    ? "MONGO_URI"
    : process.env.MONGODB_URI
      ? "MONGODB_URI"
      : process.env.DATABASE_URL
        ? "DATABASE_URL"
        : "default",
  jwtSecret: process.env.JWT_SECRET || "",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  allowAdminRegistration: process.env.ALLOW_ADMIN_REGISTRATION === "true",
  allowedOrigins: parseOrigins(process.env.ALLOWED_ORIGINS)
};
