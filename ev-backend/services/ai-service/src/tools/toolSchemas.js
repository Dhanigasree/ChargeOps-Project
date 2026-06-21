export const toolConfig = {
  tools: [
    {
      toolSpec: {
        name: "search_stations",
        description: "Search and rank real ChargeOps EV charging stations by locality, nearby known area, availability, charger type, fast charging, or price.",
        inputSchema: {
          json: {
            type: "object",
            properties: {
              query: { type: "string", description: "Free-text place or station search query." },
              chargerType: { type: "string", description: "Optional charger type filter." },
              maxPrice: { type: "number", description: "Optional maximum price per charging unit." },
              availableOnly: { type: "boolean", description: "Whether to prefer stations with available slots." },
              fastOnly: { type: "boolean", description: "Whether to prefer DC fast or CCS-style chargers." }
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
        name: "analyze_bookings",
        description: "Retrieve the signed-in user's real booking history and summarize booking patterns, recent stations, and peak hours.",
        inputSchema: {
          json: {
            type: "object",
            properties: {
              stationId: { type: "string", description: "Optional station ID to focus the analysis." }
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
        name: "get_latest_invoice",
        description: "Retrieve the signed-in user's latest successful payment invoice metadata and secure presigned download URL.",
        inputSchema: {
          json: {
            type: "object",
            properties: {}
          }
        }
      }
    },
    {
      toolSpec: {
        name: "get_payment_invoices",
        description: "Retrieve signed-in user's successful payment invoices for all time, this month, or last month, including secure invoice URLs when available.",
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
        name: "get_user_profile",
        description: "Retrieve the signed-in user's ChargeOps profile and preferences from user-service.",
        inputSchema: {
          json: {
            type: "object",
            properties: {}
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
