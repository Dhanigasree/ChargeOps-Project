import mongoose from "mongoose";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

const connections = new Map();

const uriForDatabase = (databaseName) => {
  const uri = new URL(env.mongoUri);
  uri.pathname = `/${databaseName}`;

  return uri.toString();
};

export const getCollection = async (databaseName, collectionName) => {
  const key = `${databaseName}:${collectionName}`;

  if (!connections.has(databaseName)) {
    logger.info({ databaseName }, "AI service opening read-only data connection");
    connections.set(
      databaseName,
      mongoose.createConnection(uriForDatabase(databaseName), {
        serverSelectionTimeoutMS: 10000
      }).asPromise()
    );
  }

  const connection = await connections.get(databaseName);

  logger.info({ databaseName, collectionName, key }, "AI service data collection ready");

  return connection.collection(collectionName);
};

export const userIdFromContext = (context) => {
  const token = context.authorization?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return context.userId;
  }

  try {
    const [, payload] = token.split(".");
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const parsed = JSON.parse(Buffer.from(normalized, "base64").toString("utf8"));

    return parsed.sub || parsed.id || context.userId;
  } catch {
    return context.userId;
  }
};
