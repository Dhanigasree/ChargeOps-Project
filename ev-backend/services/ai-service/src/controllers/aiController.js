import { z } from "zod";
import { logger } from "../config/logger.js";
import { getRecentMemory, saveConversation } from "../services/memoryService.js";
import { runAgent } from "../services/bedrockAgentService.js";
import { runTool } from "../tools/index.js";

const chatSchema = z.object({
  userId: z.string().min(1),
  message: z.string().min(1).max(4000)
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
  const context = {
    userId,
    authorization: req.headers.authorization
  };

  const memory = await getRecentMemory(userId);
  const answer = await runAgent({ message, memory, context });

  await saveConversation({
    userId,
    prompt: message,
    response: answer
  });

  logger.info({ userId }, "AI chat completed");

  return res.status(200).json({
    answer
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
  const result = await runTool("search_stations", { query, chargerType, maxPrice }, requestContext(req, userId));

  const answer = result.count
    ? `Recommended ${result.stations[0]?.name || "charging station"} based on availability, location, and price.`
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
  const result = await runTool("search_stations", { query: location || message || "", chargerType, maxPrice }, requestContext(req, userId));
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
