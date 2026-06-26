import { getUserPreferences, updatePreferencesFromTurn } from "../services/preferenceService.js";
import { runAgent } from "../services/bedrockAgentService.js";
import { generateMonthlyReport } from "../services/reportService.js";
import { classifyIntent } from "./agentUtils.js";
import { analyticsAgent } from "./analyticsAgent.js";
import { bookingAgent } from "./bookingAgent.js";
import { paymentAgent } from "./paymentAgent.js";
import { reviewAgent } from "./reviewAgent.js";
import { stationAgent } from "./stationAgent.js";
import { sustainabilityAgent } from "./sustainabilityAgent.js";

const agentRegistry = {
  station: stationAgent,
  booking: bookingAgent,
  payment: paymentAgent,
  review: reviewAgent,
  analytics: analyticsAgent,
  sustainability: sustainabilityAgent
};

const composeAnswer = ({ primaryResult, secondaryResults }) => {
  const parts = [primaryResult.answer, primaryResult.explainability];

  secondaryResults.forEach((result) => {
    if (result?.answer) {
      parts.push(`${result.agent}: ${result.answer}`);
    }
  });

  return parts.filter(Boolean).join("\n\n");
};

const synthesizeWithBedrock = async ({ message, memory, context, agentResult }) => {
  const synthesisPrompt = `User request: ${message}

Specialist agent result:
${JSON.stringify(agentResult, null, 2)}

Generate a concise ChargeOps answer. Keep the "Why this recommendation was made" explanation. Use tools if more live data is required.`;

  return runAgent({
    message: synthesisPrompt,
    memory,
    context,
    fallbackOnError: false
  }).catch(() => null);
};

export const listAgents = () => [
  { name: "Master Agent", role: "Classifies intent and orchestrates specialist agents." },
  ...Object.values(agentRegistry).map((agent) => ({
    name: agent.name,
    intents: agent.intents
  }))
];

export const runMasterAgent = async ({ message, memory, context }) => {
  const preferences = (await getUserPreferences(context.userId)) || {};
  const intent = classifyIntent(message);

  if (intent === "assistant") {
    const answer = await runAgent({ message, memory, context });
    await updatePreferencesFromTurn({ userId: context.userId, message, intent, structuredData: {} });

    return {
      answer,
      agents: ["Master Agent", "Bedrock Agent"],
      intent,
      insights: {},
      explainability: "Generic assistant requests are answered by the Bedrock-backed ChargeOps assistant with deterministic fallback support."
    };
  }

  if (intent === "report") {
    const report = await generateMonthlyReport({ context });
    await updatePreferencesFromTurn({ userId: context.userId, message, intent, structuredData: report });

    return {
      answer: report.report || "The monthly AI report is unavailable right now.",
      agents: ["Master Agent", "Report Agent"],
      intent,
      insights: report,
      explainability: "Monthly reports combine ChargeOps payment, booking, station, and utilization signals where available."
    };
  }

  const primaryAgent = agentRegistry[intent] || stationAgent;
  const primaryResult = await primaryAgent.run({ message, memory, context, preferences });

  const secondaryAgents = [];
  if (intent === "booking") {
    secondaryAgents.push(reviewAgent, sustainabilityAgent);
  }
  if (intent === "station") {
    secondaryAgents.push(reviewAgent);
  }
  if (intent === "payment") {
    secondaryAgents.push(sustainabilityAgent);
  }

  const secondaryResults = await Promise.all(
    secondaryAgents.map((agent) => agent.run({ message, memory, context, preferences }).catch(() => null))
  );
  const deterministicAnswer = composeAnswer({ primaryResult, secondaryResults: secondaryResults.filter(Boolean) });
  const bedrockAnswer = await synthesizeWithBedrock({
    message,
    memory,
    context,
    agentResult: {
      primaryResult,
      secondaryResults: secondaryResults.filter(Boolean)
    }
  });

  await updatePreferencesFromTurn({
    userId: context.userId,
    message,
    intent,
    structuredData: primaryResult.data
  });

  return {
    answer: bedrockAnswer || deterministicAnswer,
    agents: ["Master Agent", primaryResult.agent, ...secondaryResults.filter(Boolean).map((result) => result.agent)],
    intent,
    insights: {
      primary: primaryResult.data,
      secondary: secondaryResults.filter(Boolean).map((result) => ({ agent: result.agent, data: result.data }))
    },
    explainability: primaryResult.explainability
  };
};
