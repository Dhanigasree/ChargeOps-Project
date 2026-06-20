import { runTool } from "../tools/index.js";
import { explain, extractLocation } from "./agentUtils.js";

export const stationAgent = {
  name: "Station Agent",
  intents: ["station"],
  async run({ message, context, preferences }) {
    const query = extractLocation(message, preferences) || message;
    const stationResult = await runTool(
      "search_stations",
      {
        query,
        availableOnly: true,
        fastOnly: /fast|dc|quick/i.test(message)
      },
      context
    );

    const ranked = (stationResult.stations || []).slice(0, 5);
    const answer = ranked.length
      ? `I ranked ${ranked.length} station option(s). Recommended station: ${ranked[0].name}.`
      : "I could not find available approved stations for that request.";

    return {
      agent: this.name,
      intent: "station",
      answer,
      data: {
        stations: ranked,
        recommendation: ranked[0] || null
      },
      explainability: ranked[0]
        ? explain(
            "ranked by location relevance",
            "available charging slots",
            "charger speed",
            "price and proximity"
          )
        : "Why this recommendation was made: no matching station data was available."
    };
  }
};
