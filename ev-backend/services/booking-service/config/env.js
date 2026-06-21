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
  port: Number(process.env.PORT) || 8004,
  nodeEnv: process.env.NODE_ENV || "development",
  mongoUri: process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://127.0.0.1:27021/ev-booking-service",
  jwtSecret: process.env.JWT_SECRET || "",
  internalServiceApiKey: process.env.INTERNAL_SERVICE_API_KEY || "",
  awsRegion: process.env.AWS_REGION || "ap-south-1",
  sqsQueueUrl: process.env.SQS_QUEUE_URL || "",
  sqsNotificationQueueUrl: process.env.SQS_NOTIFICATION_QUEUE_URL || "",
  allowedOrigins: parseOrigins(process.env.ALLOWED_ORIGINS)
};
