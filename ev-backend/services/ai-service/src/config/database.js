import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "./logger.js";

const secretsManager = new SecretsManagerClient({ region: env.awsRegion });

const resolveMongoUri = async () => {
  if (!env.mongodbSecretId) {
    return env.mongoUri;
  }

  const response = await secretsManager.send(new GetSecretValueCommand({ SecretId: env.mongodbSecretId }));
  const secretValue = response.SecretString ? JSON.parse(response.SecretString) : {};

  return secretValue.MONGO_URI || secretValue.MONGODB_URI || env.mongoUri;
};

export const connectDatabase = async () => {
  const mongoUri = await resolveMongoUri();

  mongoose.set("strictQuery", true);

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 10000
  });

  logger.info("AI service connected to MongoDB");
};
