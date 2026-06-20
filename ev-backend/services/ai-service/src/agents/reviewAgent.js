import { runTool } from "../tools/index.js";
import { extractLocation } from "./agentUtils.js";

export const reviewAgent = {
  name: "Review Agent",
  intents: ["review"],
  async run({ message, context, preferences }) {
    const query = extractLocation(message, preferences);
    const stationResult = await runTool("search_stations", { query, availableOnly: false }, context);
    const stations = (stationResult.stations || []).slice(0, 5);

    const reviewed = await Promise.all(
      stations.map(async (station) => {
        const reviewResult = await runTool("get_station_reviews", { stationId: station.id || station._id }, context).catch(() => ({
          count: 0,
          averageRating: null,
          sentiment: "unknown"
        }));
        return { station, reviewResult };
      })
    );

    const ranked = reviewed
      .filter((entry) => entry.reviewResult.averageRating !== null)
      .sort((a, b) => b.reviewResult.averageRating - a.reviewResult.averageRating);
    const best = ranked[0] || reviewed[0] || null;

    return {
      agent: this.name,
      intent: "review",
      answer: best
        ? `${best.station.name} is the best review-backed option I found with ${best.reviewResult.averageRating ?? "no"} average rating.`
        : "I could not find review-backed station data for that request.",
      data: {
        reviewedStations: reviewed,
        bestRatedStation: best
      },
      explainability: "Why this recommendation was made: compared available station reviews, average ratings, and sentiment."
    };
  }
};
