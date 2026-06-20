import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "./logger.js";

const secretsManager = new SecretsManagerClient({ region: env.awsRegion });

const resolveMongoUri = async () => {
  if (!env.mongodbSecretId) {
    return env.mongoUri;
  }

  try {
    const response = await secretsManager.send(new GetSecretValueCommand({ SecretId: env.mongodbSecretId }));
    const secretValue = response.SecretString ? JSON.parse(response.SecretString) : {};

    return secretValue.MONGO_URI || secretValue.MONGODB_URI || env.mongoUri;
  } catch (error) {
    logger.warn(
      {
        err: error,
        secretId: env.mongodbSecretId
      },
      "AI service MongoDB secret unavailable, falling back to MONGO_URI"
    );

    return env.mongoUri;
  }
};

export const connectDatabase = async () => {
  const mongoUri = await resolveMongoUri();
  const uri = new URL(mongoUri);

  mongoose.set("strictQuery", true);

  logger.info(
    {
      host: uri.host,
      database: uri.pathname.replace("/", "") || "default",
      authSource: uri.searchParams.get("authSource") || "default"
    },
    "AI service connecting to MongoDB"
  );

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 10000
  });

  logger.info({ readyState: mongoose.connection.readyState }, "AI service connected to MongoDB");
};
