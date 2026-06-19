export const toolConfig = {
  tools: [
    {
      toolSpec: {
        name: "search_stations",
        description: "Search EV charging stations by locality, address, state, district, charger type, approval status, or price range.",
        inputSchema: {
          json: {
            type: "object",
            properties: {
              query: { type: "string", description: "Free-text place or station search query." },
              chargerType: { type: "string", description: "Optional charger type filter." },
              maxPrice: { type: "number", description: "Optional maximum price per charging unit." }
            }
          }
        }
      }
    },
    {
      toolSpec: {
        name: "create_booking",
        description: "Create an EV charging booking when stationId, slotTime, and amount are known.",
        inputSchema: {
          json: {
            type: "object",
            required: ["stationId", "slotTime", "amount"],
            properties: {
              stationId: { type: "string" },
              slotTime: { type: "string", description: "ISO-8601 date-time for the booking slot." },
              amount: { type: "number" }
            }
          }
        }
      }
    },
    {
      toolSpec: {
        name: "get_spending_history",
        description: "Retrieve payment history and summarize user spending.",
        inputSchema: {
          json: {
            type: "object",
            properties: {
              period: { type: "string", description: "Requested period such as this_month, last_month, all_time." }
            }
          }
        }
      }
    },
    {
      toolSpec: {
        name: "get_station_reviews",
        description: "Retrieve reviews for a known station ID.",
        inputSchema: {
          json: {
            type: "object",
            required: ["stationId"],
            properties: {
              stationId: { type: "string" }
            }
          }
        }
      }
    },
    {
      toolSpec: {
        name: "get_utilization_metrics",
        description: "Retrieve admin analytics and booking data to answer utilization, revenue, and platform operations questions.",
        inputSchema: {
          json: {
            type: "object",
            properties: {
              metric: { type: "string", description: "Metric to analyze, for example highest_utilization or platform_summary." }
            }
          }
        }
      }
    }
  ]
};
