import { z } from "zod";
import { logger } from "../config/logger.js";
import {
  appendConversationTurn,
  createSessionId,
  deleteChatSession,
  getChatSession,
  getRecentMemory,
  listChatSessions
} from "../services/memoryService.js";
import { requestJson } from "../services/httpClient.js";
import { listAgents, runMasterAgent } from "../agents/masterAgent.js";
import { runTool } from "../tools/index.js";
import { toolConfig } from "../tools/toolSchemas.js";
import { env } from "../config/env.js";
import { buildAiInsights } from "../services/insightService.js";
import { generateMonthlyReport } from "../services/reportService.js";

const chatSchema = z.object({
  userId: z.string().min(1),
  sessionId: z.string().min(1).optional(),
  message: z.string().min(1).max(4000)
});

const historyQuerySchema = z.object({
  userId: z.string().min(1),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(50).optional()
});

const historyParamsSchema = z.object({
  sessionId: z.string().min(1)
});

export const chat = async (req, res) => {
  const parsed = chatSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid chat request",
      errors: parsed.error.flatten()
    });
  }

  const { userId, message } = parsed.data;
  const sessionId = parsed.data.sessionId || createSessionId();
  const context = {
    userId,
    authorization: req.headers.authorization
  };

  const memory = await getRecentMemory({ userId, sessionId });
  const agentResult = await runMasterAgent({ message, memory, context });

  const session = await appendConversationTurn({
    userId,
    sessionId,
    prompt: message,
    response: agentResult.answer
  });

  logger.info({ userId, sessionId }, "AI chat completed");

  return res.status(200).json({
    answer: agentResult.answer,
    sessionId,
    session,
    agents: agentResult.agents,
    intent: agentResult.intent,
    insights: agentResult.insights,
    explainability: agentResult.explainability
  });
};

export const listHistory = async (req, res) => {
  const parsed = historyQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid history request",
      errors: parsed.error.flatten()
    });
  }

  const result = await listChatSessions(parsed.data);
  return res.status(200).json({
    success: true,
    ...result
  });
};

export const listAgentArchitecture = async (_req, res) =>
  res.status(200).json({
    success: true,
    architecture: {
      pattern: "Master Agent orchestrates specialist ChargeOps agents through tool-backed microservice actions.",
      agents: listAgents()
    }
  });

export const aiInsights = async (req, res) => {
  const parsed = historyQuerySchema.pick({ userId: true }).safeParse(req.query);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid insights request",
      errors: parsed.error.flatten()
    });
  }

  const context = requestContext(req, parsed.data.userId);
  const insights = await buildAiInsights({ context });

  return res.status(200).json({
    success: true,
    insights
  });
};

export const monthlyReport = async (req, res) => {
  const parsed = chatSchema.pick({ userId: true }).safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid report request",
      errors: parsed.error.flatten()
    });
  }

  const context = requestContext(req, parsed.data.userId);
  const report = await generateMonthlyReport({ context });

  return res.status(200).json({
    success: true,
    report
  });
};

export const getHistorySession = async (req, res) => {
  const query = historyQuerySchema.pick({ userId: true }).safeParse(req.query);
  const params = historyParamsSchema.safeParse(req.params);

  if (!query.success || !params.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid chat session request",
      errors: {
        query: query.error?.flatten(),
        params: params.error?.flatten()
      }
    });
  }

  const session = await getChatSession({
    userId: query.data.userId,
    sessionId: params.data.sessionId
  });

  if (!session) {
    return res.status(404).json({
      success: false,
      message: "Chat session not found"
    });
  }

  return res.status(200).json({
    success: true,
    session
  });
};

export const removeHistorySession = async (req, res) => {
  const query = historyQuerySchema.pick({ userId: true }).safeParse(req.query);
  const params = historyParamsSchema.safeParse(req.params);

  if (!query.success || !params.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid delete chat session request",
      errors: {
        query: query.error?.flatten(),
        params: params.error?.flatten()
      }
    });
  }

  const deleted = await deleteChatSession({
    userId: query.data.userId,
    sessionId: params.data.sessionId
  });

  return res.status(deleted ? 200 : 404).json({
    success: deleted,
    message: deleted ? "Chat session deleted" : "Chat session not found"
  });
};

const optionalUserRequestSchema = z.object({
  userId: z.string().min(1).optional(),
  message: z.string().min(1).max(4000).optional(),
  location: z.string().min(1).max(200).optional(),
  stationId: z.string().min(1).max(200).optional(),
  slotTime: z.string().min(1).max(200).optional(),
  chargerType: z.string().min(1).max(100).optional(),
  maxPrice: z.coerce.number().positive().optional(),
  amount: z.coerce.number().positive().optional(),
  period: z.string().min(1).max(100).optional()
});

const requestContext = (req, userId) => ({
  userId,
  authorization: req.headers.authorization
});

export const aiHealth = async (req, res) =>
  res.status(200).json({
    success: true,
    message: "AI service API is healthy"
  });

export const listTools = async (req, res) =>
  res.status(200).json({
    success: true,
    agents: listAgents(),
    tools: toolConfig.tools.map(({ toolSpec }) => ({
      name: toolSpec.name,
      description: toolSpec.description,
      inputSchema: toolSpec.inputSchema
    }))
  });

export const debug = async (req, res) => {
  const services = [
    ["station-service", env.stationServiceUrl],
    ["booking-service", env.bookingServiceUrl],
    ["payment-service", env.paymentServiceUrl],
    ["review-service", env.reviewServiceUrl],
    ["admin-service", env.adminServiceUrl],
    ["user-service", env.userServiceUrl]
  ];

  const checks = await Promise.all(
    services.map(async ([name, baseUrl]) => {
      try {
        const payload = await requestJson({ baseUrl, path: "/health" });
        return { name, baseUrl, ok: true, payload };
      } catch (error) {
        return { name, baseUrl, ok: false, message: error.message, statusCode: error.statusCode || 500 };
      }
    })
  );

  return res.status(200).json({
    success: true,
    bedrock: {
      region: env.awsRegion,
      modelId: env.bedrockModelId
    },
    services: checks
  });
};

export const recommendStation = async (req, res) => {
  const parsed = optionalUserRequestSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid station recommendation request",
      errors: parsed.error.flatten()
    });
  }

  const { userId = "anonymous", location, message, chargerType, maxPrice } = parsed.data;
  const query = location || message || "";
  const result = await runTool("search_stations", { query, chargerType, maxPrice, availableOnly: true }, requestContext(req, userId));

  const answer = result.count
    ? `Recommended ${result.stations[0]?.name || "charging station"} based on live availability, location relevance, charger type, and price.`
    : "No matching charging stations were found for the requested location.";

  return res.status(200).json({
    answer,
    data: result
  });
};

export const optimizeBooking = async (req, res) => {
  const parsed = optionalUserRequestSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid booking optimization request",
      errors: parsed.error.flatten()
    });
  }

  const { userId = "anonymous", location, message, chargerType, maxPrice } = parsed.data;
  const result = await runTool("search_stations", { query: location || message || "", chargerType, maxPrice, availableOnly: true }, requestContext(req, userId));
  const bestStation = result.stations[0] || null;

  return res.status(200).json({
    answer: bestStation
      ? `Best booking option: ${bestStation.name}. It currently reports ${bestStation.availability?.slots ?? 0} available slot(s).`
      : "I could not identify an available station to optimize this booking.",
    data: {
      bestStation,
      alternatives: result.stations.slice(1, 5)
    }
  });
};

export const optimizeChargingCost = async (req, res) => {
  const parsed = optionalUserRequestSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid cost optimization request",
      errors: parsed.error.flatten()
    });
  }

  const { userId = "anonymous", location, message, chargerType, maxPrice } = parsed.data;
  const result = await runTool("search_stations", { query: location || message || "", chargerType, maxPrice }, requestContext(req, userId));
  const sorted = [...result.stations].sort((a, b) => Number(a.pricePerUnit || Infinity) - Number(b.pricePerUnit || Infinity));

  return res.status(200).json({
    answer: sorted[0]
      ? `Lowest estimated charging cost option: ${sorted[0].name} at ${sorted[0].pricePerUnit} per unit.`
      : "I could not find station pricing data for that request.",
    data: {
      cheapestStation: sorted[0] || null,
      rankedStations: sorted.slice(0, 5)
    }
  });
};

export const usageAnalytics = async (req, res) => {
  const parsed = optionalUserRequestSchema.safeParse(req.query);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid usage analytics request",
      errors: parsed.error.flatten()
    });
  }

  const { userId = "anonymous", period = "this_month" } = parsed.data;
  const result = await runTool("get_spending_history", { period }, requestContext(req, userId));

  return res.status(200).json({
    answer: result.needsAuthentication
      ? "Please sign in to view usage analytics."
      : `Usage analytics for ${period}: ${result.total.toFixed(2)} ${result.currency.toUpperCase()} spent across ${result.payments.length} payment(s).`,
    data: result
  });
};
