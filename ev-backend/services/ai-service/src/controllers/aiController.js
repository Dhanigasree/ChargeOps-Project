import { z } from "zod";
import { logger } from "../config/logger.js";
import { getRecentMemory, saveConversation } from "../services/memoryService.js";
import { runAgent } from "../services/bedrockAgentService.js";

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
