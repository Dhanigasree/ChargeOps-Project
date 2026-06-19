import mongoose from "mongoose";
import { env } from "./env.js";

const connectionState = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting"
};

const getMongoUriDetails = (mongoUri) => {
  try {
    const parsed = new URL(mongoUri);
    return {
      host: parsed.host,
      database: parsed.pathname.replace("/", "") || "admin",
      authSource: parsed.searchParams.get("authSource") || "default"
    };
  } catch {
    return {
      host: "unparseable",
      database: "unknown",
      authSource: "unknown"
    };
  }
};

mongoose.set("bufferCommands", false);

mongoose.connection.on("connected", () => {
  console.log("User service MongoDB event: connected", {
    state: connectionState[mongoose.connection.readyState]
  });
});

mongoose.connection.on("disconnected", () => {
  console.error("User service MongoDB event: disconnected", {
    state: connectionState[mongoose.connection.readyState]
  });
});

mongoose.connection.on("reconnected", () => {
  console.log("User service MongoDB event: reconnected", {
    state: connectionState[mongoose.connection.readyState]
  });
});

mongoose.connection.on("error", (error) => {
  console.error("User service MongoDB event: error", error.message);
});

export const connectDatabase = async () => {
  const maxRetries = Number.parseInt(process.env.MONGO_CONNECT_MAX_RETRIES ?? "12", 10);
  const retryDelayMs = Number.parseInt(process.env.MONGO_CONNECT_RETRY_DELAY_MS ?? "5000", 10);
  const uriDetails = getMongoUriDetails(env.mongoUri);

  console.log("User service MongoDB configuration", {
    source: env.mongoUriSource,
    host: uriDetails.host,
    database: uriDetails.database,
    authSource: uriDetails.authSource,
    initialState: connectionState[mongoose.connection.readyState]
  });

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      await mongoose.connect(env.mongoUri, {
        autoIndex: env.nodeEnv !== "production",
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000
      });

      console.log("User service connected to MongoDB", {
        host: uriDetails.host,
        database: uriDetails.database,
        state: connectionState[mongoose.connection.readyState]
      });
      return;
    } catch (error) {
      console.error(`User service MongoDB connection attempt ${attempt}/${maxRetries} failed`, error.message);

      if (attempt === maxRetries) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }
};

export const getDatabaseHealth = () => ({
  state: connectionState[mongoose.connection.readyState],
  readyState: mongoose.connection.readyState
});
