import { getUserPreferences, updatePreferencesFromTurn } from "../services/preferenceService.js";
import { runAgent } from "../services/bedrockAgentService.js";
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

  if (intent === "assistant" || intent === "report") {
    const stationResult = await stationAgent.run({ message, memory, context, preferences });
    await updatePreferencesFromTurn({ userId: context.userId, message, intent, structuredData: stationResult.data });
    return {
      answer: `${stationResult.answer}\n\n${stationResult.explainability}`,
      agents: ["Master Agent", stationResult.agent],
      intent,
      insights: stationResult.data,
      explainability: stationResult.explainability
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
