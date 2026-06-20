import { runTool } from "../tools/index.js";

export const analyticsAgent = {
  name: "Analytics Agent",
  intents: ["analytics"],
  async run({ context }) {
    const metrics = await runTool("get_utilization_metrics", { metric: "platform_summary" }, context);
    const highest = metrics.highestUtilization;

    return {
      agent: this.name,
      intent: "analytics",
      answer: highest
        ? `Highest utilization is station ${highest.stationId} with ${highest.totalBookings} total booking(s).`
        : "I could not find utilization data yet.",
      data: {
        analytics: metrics.analytics,
        utilization: metrics.utilization,
        highestUtilization: highest,
        heatmap: (metrics.utilization || []).slice(0, 8).map((item) => ({
          stationId: item.stationId,
          value: item.totalBookings
        }))
      },
      explainability: "Why this recommendation was made: ranked stations by booking volume and active bookings from admin analytics."
    };
  }
};
