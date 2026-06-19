import { getUtilizationMetrics } from "./adminTool.js";
import { createBooking } from "./bookingTool.js";
import { getSpendingHistory } from "./paymentTool.js";
import { getStationReviews } from "./reviewTool.js";
import { searchStations } from "./stationTool.js";

export const tools = {
  search_stations: searchStations,
  create_booking: createBooking,
  get_spending_history: getSpendingHistory,
  get_station_reviews: getStationReviews,
  get_utilization_metrics: getUtilizationMetrics
};

export const runTool = async (name, input, context) => {
  const tool = tools[name];

  if (!tool) {
    throw new Error(`Unknown AI tool requested: ${name}`);
  }

  return tool(input, context);
};
