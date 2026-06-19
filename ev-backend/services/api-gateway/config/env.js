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
  port: Number(process.env.PORT) || 8000,
  nodeEnv: process.env.NODE_ENV || "development",
  allowedOrigins: parseOrigins(process.env.ALLOWED_ORIGINS),
  services: {
    auth: process.env.AUTH_SERVICE_URL || "http://localhost:8001",
    user: process.env.USER_SERVICE_URL || "http://localhost:8002",
    station: process.env.STATION_SERVICE_URL || "http://localhost:8003",
    booking: process.env.BOOKING_SERVICE_URL || "http://localhost:8004",
    payment: process.env.PAYMENT_SERVICE_URL || "http://localhost:8005",
    review: process.env.REVIEW_SERVICE_URL || "http://localhost:8006",
    admin: process.env.ADMIN_SERVICE_URL || "http://localhost:8007",
    ai: process.env.AI_SERVICE_URL || "http://localhost:8008"
  }
};
