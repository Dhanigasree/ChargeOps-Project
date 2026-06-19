import mongoose from "mongoose";
import { logger } from "../config/logger.js";
import { env } from "../config/env.js";
import ChatHistory from "../models/ChatHistory.js";

export const getRecentMemory = async (userId) => {
  if (mongoose.connection.readyState !== 1) {
    return [];
  }

  try {
    const conversations = await ChatHistory.find({ userId }).sort({ timestamp: -1 }).limit(env.memoryLimit).lean();
    return conversations.reverse();
  } catch (error) {
    logger.warn({ err: error, userId }, "Failed to retrieve AI chat memory");
    return [];
  }
};

export const saveConversation = async ({ userId, prompt, response }) => {
  if (mongoose.connection.readyState !== 1) {
    return;
  }

  try {
    await ChatHistory.create({
      userId,
      prompt,
      response
    });
  } catch (error) {
    logger.warn({ err: error, userId }, "Failed to save AI chat memory");
  }
};
