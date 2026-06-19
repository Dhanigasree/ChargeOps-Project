import pino from "pino";
import { env } from "./env.js";

export const logger = pino({
  level: process.env.LOG_LEVEL || (env.nodeEnv === "production" ? "info" : "debug"),
  base: {
    service: "ai-service"
  },
  redact: {
    paths: ["req.headers.authorization", "authorization", "*.authorization", "*.token", "*.password"],
    remove: true
  }
});
