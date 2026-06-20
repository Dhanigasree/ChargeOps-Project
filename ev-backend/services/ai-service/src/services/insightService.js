import { analyticsAgent } from "../agents/analyticsAgent.js";
import { bookingAgent } from "../agents/bookingAgent.js";
import { paymentAgent } from "../agents/paymentAgent.js";
import { stationAgent } from "../agents/stationAgent.js";
import { sustainabilityAgent } from "../agents/sustainabilityAgent.js";
import { getUserPreferences } from "./preferenceService.js";
import { formatHour } from "../agents/agentUtils.js";

export const buildAiInsights = async ({ context }) => {
  const preferences = (await getUserPreferences(context.userId)) || {};
  const message = preferences.favoriteLocations?.[0]
    ? `Recommend stations near ${preferences.favoriteLocations[0]}`
    : "Recommend the best station";

  const [station, booking, payment, sustainability, analytics] = await Promise.all([
    stationAgent.run({ message, context, preferences }).catch((error) => ({ error: error.message, data: {} })),
    bookingAgent.run({ message: "Predict the best booking option", context, preferences }).catch((error) => ({ error: error.message, data: {} })),
    paymentAgent.run({ message: "How much did I spend this month?", context, preferences }).catch((error) => ({ error: error.message, data: {} })),
    sustainabilityAgent.run({ message: "Show sustainability impact", context, preferences }).catch((error) => ({ error: error.message, data: {} })),
    analyticsAgent.run({ message: "Show utilization analytics", context, preferences }).catch((error) => ({ error: error.message, data: {} }))
  ]);

  const recommendation = station.data?.recommendation || booking.data?.recommendedStation || null;
  const predictedHour = booking.data?.predictedBestHour;

  return {
    recommendedStation: recommendation,
    monthlySpend: payment.data?.monthlySpend || 0,
    currency: payment.data?.currency || "usd",
    co2SavedKg: sustainability.data?.co2SavedKg || 0,
    greenEnergySharePct: sustainability.data?.greenEnergySharePct || 0,
    peakUsageTime: analytics.data?.highestUtilization
      ? `${analytics.data.highestUtilization.totalBookings} booking(s) at top station`
      : formatHour(booking.data?.peakHour?.hour),
    predictedNextBooking: recommendation
      ? `${recommendation.name} around ${formatHour(predictedHour)}`
      : `Around ${formatHour(predictedHour)}`,
    utilizationHeatmap: analytics.data?.heatmap || [],
    preferences,
    explainability: {
      recommendedStation: station.explainability,
      booking: booking.explainability,
      payment: payment.explainability,
      sustainability: sustainability.explainability,
      analytics: analytics.explainability
    },
    agents: [station.agent, booking.agent, payment.agent, sustainability.agent, analytics.agent].filter(Boolean)
  };
};
