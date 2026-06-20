import { getUtilizationMetrics } from "./adminTool.js";
import { analyzeBookings, createBooking } from "./bookingTool.js";
import { getSpendingHistory } from "./paymentTool.js";
import { getStationReviews } from "./reviewTool.js";
import { searchStations } from "./stationTool.js";
import { getUserProfile } from "./userTool.js";

export const tools = {
  search_stations: searchStations,
  create_booking: createBooking,
  analyze_bookings: analyzeBookings,
  get_spending_history: getSpendingHistory,
  get_station_reviews: getStationReviews,
  get_user_profile: getUserProfile,
  get_utilization_metrics: getUtilizationMetrics
};

export const runTool = async (name, input, context) => {
  const tool = tools[name];

  if (!tool) {
    throw new Error(`Unknown AI tool requested: ${name}`);
  }

  return tool(input, context);
};
