import { runTool } from "../tools/index.js";
import { explain, extractLocation, formatHour } from "./agentUtils.js";

export const bookingAgent = {
  name: "Booking Agent",
  intents: ["booking"],
  async run({ message, context, preferences }) {
    const query = extractLocation(message, preferences);
    const [stationResult, bookingResult] = await Promise.all([
      runTool("search_stations", { query, availableOnly: true, fastOnly: /fast|dc/i.test(message) }, context),
      runTool("analyze_bookings", {}, context).catch((error) => ({
        bookingCount: 0,
        peakHour: null,
        recentBookings: [],
        message: error.message
      }))
    ]);

    const stations = stationResult.stations || [];
    const bestStation = stations[0] || null;
    const predictedHour = bookingResult.peakHour?.hour ?? preferences.preferredChargingHours?.[0] ?? 10;

    return {
      agent: this.name,
      intent: "booking",
      answer: bestStation
        ? `Best booking option: ${bestStation.name} around ${formatHour(predictedHour)}.`
        : `I could not find a strong booking option. Your likely preferred time is ${formatHour(predictedHour)}.`,
      data: {
        predictedBestHour: predictedHour,
        peakHour: bookingResult.peakHour,
        recommendedStation: bestStation,
        alternatives: stations.slice(1, 4),
        bookingHistory: bookingResult
      },
      explainability: explain(
        bestStation ? "station has available slots" : "",
        "uses your booking history and preferred charging time",
        "avoids known peak-hour congestion where possible"
      )
    };
  }
};
