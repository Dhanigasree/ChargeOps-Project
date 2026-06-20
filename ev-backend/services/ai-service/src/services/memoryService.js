import mongoose from "mongoose";
import crypto from "node:crypto";
import { logger } from "../config/logger.js";
import { env } from "../config/env.js";
import ChatSession from "../models/ChatSession.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const buildTitle = (message) => {
  const normalized = String(message || "New chat").replace(/\s+/g, " ").trim();
  return normalized.length > 64 ? `${normalized.slice(0, 61)}...` : normalized || "New chat";
};

const serializeSession = (session) => ({
  id: session._id?.toString(),
  userId: session.userId,
  sessionId: session.sessionId,
  title: session.title,
  createdAt: session.createdAt,
  updatedAt: session.updatedAt,
  messages: session.messages || [],
  messageCount: session.messages?.length || 0,
  lastMessage: session.messages?.length ? session.messages[session.messages.length - 1] : null
});

export const createSessionId = () => crypto.randomUUID();

export const getRecentMemory = async ({ userId, sessionId, limit = env.memoryLimit }) => {
  if (mongoose.connection.readyState !== 1) {
    return [];
  }

  try {
    if (!sessionId) {
      return [];
    }

    const session = await ChatSession.findOne({ userId, sessionId }).select("messages").lean();
    const messages = session?.messages || [];
    return messages.slice(-Math.max(1, Number(limit) || env.memoryLimit));
  } catch (error) {
    logger.warn({ err: error, userId, sessionId }, "Failed to retrieve AI chat memory");
    return [];
  }
};

export const appendConversationTurn = async ({ userId, sessionId, prompt, response }) => {
  if (mongoose.connection.readyState !== 1) {
    return null;
  }

  try {
    let session = await ChatSession.findOne({ userId, sessionId });

    if (!session) {
      session = new ChatSession({
        userId,
        sessionId,
        title: buildTitle(prompt),
        messages: []
      });
    }

    session.messages.push(
      {
        role: "user",
        content: prompt,
        timestamp: new Date()
      },
      {
        role: "assistant",
        content: response,
        timestamp: new Date()
      }
    );

    await session.save();
    return serializeSession(session.toObject());
  } catch (error) {
    logger.warn({ err: error, userId, sessionId }, "Failed to save AI chat memory");
    return null;
  }
};

export const listChatSessions = async ({ userId, page = DEFAULT_PAGE, limit = DEFAULT_LIMIT }) => {
  if (mongoose.connection.readyState !== 1) {
    return { sessions: [], pagination: { page: 1, limit: DEFAULT_LIMIT, total: 0, pages: 0 } };
  }

  const normalizedPage = toPositiveInt(page, DEFAULT_PAGE);
  const normalizedLimit = Math.min(toPositiveInt(limit, DEFAULT_LIMIT), MAX_LIMIT);
  const skip = (normalizedPage - 1) * normalizedLimit;

  const [sessions, total] = await Promise.all([
    ChatSession.find({ userId }).sort({ updatedAt: -1 }).skip(skip).limit(normalizedLimit).lean(),
    ChatSession.countDocuments({ userId })
  ]);

  return {
    sessions: sessions.map(serializeSession),
    pagination: {
      page: normalizedPage,
      limit: normalizedLimit,
      total,
      pages: Math.ceil(total / normalizedLimit)
    }
  };
};

export const getChatSession = async ({ userId, sessionId }) => {
  if (mongoose.connection.readyState !== 1) {
    return null;
  }

  const session = await ChatSession.findOne({ userId, sessionId }).lean();
  return session ? serializeSession(session) : null;
};

export const deleteChatSession = async ({ userId, sessionId }) => {
  if (mongoose.connection.readyState !== 1) {
    return false;
  }

  const result = await ChatSession.deleteOne({ userId, sessionId });
  return result.deletedCount > 0;
};
