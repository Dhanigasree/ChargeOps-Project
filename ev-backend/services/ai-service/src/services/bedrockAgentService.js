import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { answerWithFallbackIntent } from "./fallbackIntentService.js";
import { runTool } from "../tools/index.js";
import { toolConfig } from "../tools/toolSchemas.js";

const bedrockClient = new BedrockRuntimeClient({ region: env.awsRegion });

const systemPrompt = `You are ChargeOps Assistant Agent, an agentic AI layer for an EV charging management platform.
Use available tools to answer operational questions and perform actions. Never invent station IDs, booking confirmations, payments, reviews, or utilization metrics.
If a user asks to book but has not provided stationId, slotTime, and amount, ask for the missing fields.
Format answers naturally and concisely. Use recent conversation context only when it helps.`;

const buildMessages = ({ message, memory }) => {
  const memoryText = memory
    .map((item) => {
      if (item.prompt || item.response) {
        return `User: ${item.prompt || ""}\nAssistant: ${item.response || ""}`;
      }

      const label = item.role === "assistant" ? "Assistant" : "User";
      return `${label}: ${item.content || ""}`;
    })
    .join("\n\n");

  return [
    {
      role: "user",
      content: [
        {
          text: `${memoryText ? `Recent conversation:\n${memoryText}\n\n` : ""}Current user message:\n${message}`
        }
      ]
    }
  ];
};

const textFromMessage = (message) =>
  (message.content || [])
    .filter((block) => block.text)
    .map((block) => block.text)
    .join("\n")
    .trim();

const toolUsesFromMessage = (message) => (message.content || []).filter((block) => block.toolUse).map((block) => block.toolUse);

export const runAgent = async ({ message, memory, context }) => {
  const messages = buildMessages({ message, memory });

  try {
    for (let step = 0; step < 4; step += 1) {
      logger.info(
        {
          modelId: env.bedrockModelId,
          region: env.awsRegion,
          step,
          userId: context.userId,
          messageCount: messages.length
        },
        "Invoking Amazon Bedrock"
      );

      const response = await bedrockClient.send(
        new ConverseCommand({
          modelId: env.bedrockModelId,
          system: [{ text: systemPrompt }],
          messages,
          inferenceConfig: {
            maxTokens: env.bedrockMaxTokens,
            temperature: env.bedrockTemperature
          },
          toolConfig
        })
      );

      logger.info(
        {
          modelId: env.bedrockModelId,
          step,
          stopReason: response.stopReason,
          usage: response.usage,
          metrics: response.metrics
        },
        "Amazon Bedrock response received"
      );

      const assistantMessage = response.output?.message;
      if (!assistantMessage) {
        logger.warn({ modelId: env.bedrockModelId, step }, "Amazon Bedrock response did not include a message");
        break;
      }

      messages.push(assistantMessage);

      const toolUses = toolUsesFromMessage(assistantMessage);
      if (!toolUses.length) {
        const answer = textFromMessage(assistantMessage);
        if (answer) {
          return answer;
        }
        break;
      }

      const toolResults = await Promise.all(
        toolUses.map(async (toolUse) => {
          try {
            logger.info({ tool: toolUse.name, userId: context.userId }, "Running AI tool");
            const result = await runTool(toolUse.name, toolUse.input || {}, context);
            logger.info({ tool: toolUse.name, userId: context.userId }, "AI tool completed");
            return {
              toolResult: {
                toolUseId: toolUse.toolUseId,
                content: [{ json: result }]
              }
            };
          } catch (error) {
            logger.warn({ err: error, tool: toolUse.name }, "AI tool execution failed");
            return {
              toolResult: {
                toolUseId: toolUse.toolUseId,
                status: "error",
                content: [{ json: { message: error.message, statusCode: error.statusCode || 500 } }]
              }
            };
          }
        })
      );

      messages.push({
        role: "user",
        content: toolResults
      });
    }
  } catch (error) {
    logger.warn(
      {
        err: error,
        modelId: env.bedrockModelId,
        region: env.awsRegion,
        userId: context.userId
      },
      "Bedrock agent failed, using fallback intent service"
    );
  }

  return answerWithFallbackIntent({ message, memory, context });
};
