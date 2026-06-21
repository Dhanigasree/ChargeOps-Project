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
  port: Number(process.env.PORT) || 8005,
  nodeEnv: process.env.NODE_ENV || "development",
  mongoUri: process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://127.0.0.1:27022/ev-payment-service",
  jwtSecret: process.env.JWT_SECRET || "",
  bookingServiceUrl: process.env.BOOKING_SERVICE_URL || "http://localhost:8004",
  internalServiceApiKey: process.env.INTERNAL_SERVICE_API_KEY || "",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  stripeCurrency: process.env.STRIPE_CURRENCY || "usd",
  stripeMinimumChargeAmount: Number(process.env.STRIPE_MIN_CHARGE_AMOUNT) || 0.5,
  frontendAppUrl: process.env.FRONTEND_APP_URL || "http://localhost:3000",
  awsRegion: process.env.AWS_REGION || "ap-south-1",
  sqsQueueUrl: process.env.SQS_QUEUE_URL || "",
  sqsNotificationQueueUrl: process.env.SQS_NOTIFICATION_QUEUE_URL || "",
  sqsWaitTimeSeconds: Number(process.env.SQS_WAIT_TIME_SECONDS) || 20,
  sqsMaxMessages: Number(process.env.SQS_MAX_MESSAGES) || 5,
  sqsVisibilityTimeoutSeconds: Number(process.env.SQS_VISIBILITY_TIMEOUT_SECONDS) || 120,
  s3BucketName: process.env.S3_BUCKET_NAME || process.env.PAYMENT_INVOICE_BUCKET_NAME || "",
  s3PresignedUrlExpiresSeconds: Number(process.env.S3_PRESIGNED_URL_EXPIRES_SECONDS) || 900,
  userServiceUrl: process.env.USER_SERVICE_URL || "http://localhost:8002",
  stationServiceUrl: process.env.STATION_SERVICE_URL || "http://localhost:8003",
  allowedOrigins: parseOrigins(process.env.ALLOWED_ORIGINS)
};
