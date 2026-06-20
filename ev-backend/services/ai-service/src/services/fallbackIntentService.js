import { runTool } from "../tools/index.js";

const placeAfterNear = (message) => {
  const match = message.match(/\bnear\s+([a-zA-Z0-9\s-]+)/i);
  return match?.[1]?.trim();
};

const stationIdFromMessage = (message) => {
  const match = message.match(/\bstation(?:\s+id)?\s*[:#-]?\s*([a-f0-9]{24}|[a-zA-Z0-9_-]+)/i);
  return match?.[1];
};

const formatStationSearch = (result, query) => {
  if (!result.count) {
    return `I could not find approved charging stations${query ? ` near ${query}` : ""}. Try a nearby locality or a broader search.`;
  }

  const lines = result.stations.slice(0, 5).map((station, index) => {
    const location = [station.location?.locality, station.location?.district, station.location?.state].filter(Boolean).join(", ");
    return `${index + 1}. ${station.name} (${location || station.location?.address || "location unavailable"}) - ${station.chargerType}, ${station.availability?.slots ?? 0} slots, ${station.pricePerUnit} per unit`;
  });

  return `I found ${result.count} approved charging station${result.count === 1 ? "" : "s"}${query ? ` near ${query}` : ""}:\n${lines.join("\n")}`;
};

export const answerWithFallbackIntent = async ({ message, context }) => {
  const lower = message.toLowerCase();

  if (/(find|search|near|station|charger|charging)/.test(lower) && !/(review|book|spend|utilization)/.test(lower)) {
    const query = placeAfterNear(message) || message.replace(/find|search|ev|charging|chargers?|stations?|near/gi, "").trim();
    const result = await runTool("search_stations", { query }, context);
    return formatStationSearch(result, query);
  }

  if (/(review|rating|feedback)/.test(lower)) {
    const stationId = stationIdFromMessage(message);
    if (!stationId) {
      return "Which station ID should I retrieve reviews for?";
    }
    const result = await runTool("get_station_reviews", { stationId }, context);
    return `I found ${result.count} review${result.count === 1 ? "" : "s"} for station ${stationId}. ${
      result.reviews
        .slice(0, 3)
        .map((review) => `${review.rating || "Unrated"}/5: ${review.comment || review.review || "No comment"}`)
        .join(" ")
    }`;
  }

  if (/(spend|spent|payment|revenue|cost)/.test(lower)) {
    let result;
    try {
      result = await runTool("get_spending_history", { period: lower.includes("last month") ? "last_month" : "this_month" }, context);
    } catch (error) {
      return "I can reach the AI service, but I could not retrieve payment history from the payment service right now. Please check your payments page or try again later.";
    }

    if (result.needsAuthentication) {
      return "Please sign in so I can retrieve your payment history.";
    }
    return `Your ${result.period.replace("_", " ")} spending is ${result.total.toFixed(2)} ${result.currency.toUpperCase()} across ${result.payments.length} successful payment${result.payments.length === 1 ? "" : "s"}.`;
  }

  if (/(utilization|analytics|highest|admin|metric)/.test(lower)) {
    let result;
    try {
      result = await runTool("get_utilization_metrics", { metric: "highest_utilization" }, context);
    } catch (error) {
      return "I can reach the AI service, but I could not retrieve admin utilization metrics right now.";
    }

    if (result.needsAuthentication) {
      return "Please sign in with an admin account so I can retrieve utilization analytics.";
    }
    if (!result.highestUtilization) {
      return "I could not find booking utilization data yet.";
    }
    return `Station ${result.highestUtilization.stationId} has the highest utilization with ${result.highestUtilization.totalBookings} total booking${result.highestUtilization.totalBookings === 1 ? "" : "s"}. Platform totals: ${result.analytics.totalBookings} bookings and ${result.analytics.totalRevenue} revenue.`;
  }

  if (/(book|reserve)/.test(lower)) {
    return "I can create that booking once you provide the station ID, slot time, and expected amount.";
  }

  return "I can help find stations, create bookings, summarize spending, retrieve reviews, and analyze admin utilization. What would you like me to do?";
};
