import { runTool } from "../tools/index.js";

const placeAfterNear = (message) => {
  const match = message.match(/\bnear\s+([a-zA-Z0-9\s-]+)/i);
  return match?.[1]?.trim();
};

const stationIdFromMessage = (message) => {
  const match = message.match(/\bstation(?:\s+id)?\s*[:#-]?\s*([a-f0-9]{24}|[a-zA-Z0-9_-]+)/i);
  return match?.[1];
};

const lastStationQueryFromMemory = (memory = []) => {
  const userMessages = memory.filter((item) => item.role === "user" || item.prompt).reverse();

  for (const item of userMessages) {
    const content = item.content || item.prompt || "";
    const lower = content.toLowerCase();
    if (/(find|search|near|station|charger|charging)/.test(lower) && !/(review|rating|feedback)/.test(lower)) {
      return placeAfterNear(content) || content.replace(/find|search|ev|charging|chargers?|stations?|near/gi, "").trim();
    }
  }

  return "";
};

const formatStationSearch = (result, query) => {
  if (!result.count) {
    return `I could not find approved charging stations${query ? ` near ${query}` : ""}. Try a nearby locality or a broader search.`;
  }

  const lines = result.stations.slice(0, 5).map((station, index) => {
    const location = [station.location?.locality, station.location?.district, station.location?.state].filter(Boolean).join(", ");
    const distance = station.distanceKm === null || station.distanceKm === undefined ? "" : `, about ${station.distanceKm} km from the requested area`;
    return `${index + 1}. ${station.name} (${location || station.location?.address || "location unavailable"}) - ${station.chargerType}, ${station.availability?.slots ?? 0} slots, ${station.pricePerUnit} per unit${distance}`;
  });

  const broadened = result.broadened ? " I did not find an exact locality match, so I ranked the closest relevant ChargeOps stations from live station data." : "";

  return `I found ${result.count} approved charging station${result.count === 1 ? "" : "s"}${query ? ` near ${query}` : ""}.${broadened}\n${lines.join("\n")}`;
};

const answerBestRatedFromMemory = async ({ memory, context }) => {
  const query = lastStationQueryFromMemory(memory);
  if (!query) {
    return "Which station ID or area should I use to retrieve reviews?";
  }

  const stationResult = await runTool("search_stations", { query, availableOnly: true }, context);
  const stations = stationResult.stations || [];

  if (!stations.length) {
    return `I could not find the earlier station list for ${query}. Please search stations again.`;
  }

  const ratedStations = await Promise.all(
    stations.slice(0, 5).map(async (station) => {
      try {
        const reviewResult = await runTool("get_station_reviews", { stationId: station.id || station._id }, context);
        return {
          station,
          reviewResult
        };
      } catch (error) {
        return {
          station,
          reviewResult: { count: 0, averageRating: null, reviews: [] }
        };
      }
    })
  );

  const withRatings = ratedStations.filter(({ reviewResult }) => reviewResult.averageRating !== null);

  if (!withRatings.length) {
    const names = stations
      .slice(0, 5)
      .map((station) => station.name)
      .filter(Boolean)
      .join(", ");
    return `I found the earlier stations near ${query}, but I could not find review ratings for them yet. Stations checked: ${names}.`;
  }

  withRatings.sort((a, b) => b.reviewResult.averageRating - a.reviewResult.averageRating);
  const best = withRatings[0];

  return `${best.station.name} has the best rating from the stations near ${query}: ${best.reviewResult.averageRating}/5 based on ${best.reviewResult.count} review${best.reviewResult.count === 1 ? "" : "s"}.`;
};

export const answerWithFallbackIntent = async ({ message, memory = [], context }) => {
  const lower = message.toLowerCase();

  if (/(find|search|near|station|charger|charging)/.test(lower) && !/(review|book|spend|utilization)/.test(lower)) {
    const query = placeAfterNear(message) || message.replace(/find|search|ev|charging|chargers?|stations?|near/gi, "").trim();
    const result = await runTool("search_stations", { query, fastOnly: /fast|dc|quick/i.test(lower), availableOnly: true }, context);
    return formatStationSearch(result, query);
  }

  if (/(review|rating|feedback)/.test(lower)) {
    const stationId = stationIdFromMessage(message);
    if (!stationId) {
      return answerBestRatedFromMemory({ memory, context });
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
    return `Your ${result.period.replace("_", " ")} spending is ${result.total.toFixed(2)} ${result.currency.toUpperCase()} across ${result.payments.length} successful payment${result.payments.length === 1 ? "" : "s"}. All-time successful spending is ${result.totalAllTime.toFixed(2)} ${result.currency.toUpperCase()}.`;
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
    return `Station ${result.highestUtilization.stationId} has the highest utilization with ${result.highestUtilization.totalBookings} total booking${result.highestUtilization.totalBookings === 1 ? "" : "s"} and ${result.highestUtilization.activeBookings} active booking${result.highestUtilization.activeBookings === 1 ? "" : "s"}. Platform totals: ${result.analytics.totalBookings} bookings and ${result.analytics.totalRevenue} revenue.`;
  }

  if (/(book|reserve)/.test(lower)) {
    const query = placeAfterNear(message) || message.replace(/book|reserve|charger|charging|station|tomorrow|at|\d{1,2}\s*(am|pm)?/gi, "").trim();
    const result = await runTool("search_stations", { query, availableOnly: true, fastOnly: /fast|dc/i.test(lower) }, context);
    const bestStation = result.stations[0];

    if (!bestStation) {
      return "I can help with booking, but I could not find an available approved station from the live station data. Try a nearby city or locality.";
    }

    return `Based on live station data, I recommend ${bestStation.name} (${bestStation.location?.locality}, ${bestStation.location?.district}) for that booking. It has ${bestStation.availability?.slots ?? 0} available slot(s), charger type ${bestStation.chargerType}, and price ${bestStation.pricePerUnit} per unit. To create the booking, confirm this station ID: ${bestStation.id}, the exact slot time, and expected amount.`;
  }

  return "I can help find stations, create bookings, summarize spending, retrieve reviews, and analyze admin utilization. What would you like me to do?";
};
