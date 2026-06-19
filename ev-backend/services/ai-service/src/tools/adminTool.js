import { env } from "../config/env.js";
import { requestJson } from "../services/httpClient.js";

const summarizeUtilization = (bookings = []) => {
  const byStation = new Map();

  bookings.forEach((booking) => {
    const stationId = booking.stationId || "unknown";
    const current = byStation.get(stationId) || { stationId, totalBookings: 0, activeBookings: 0 };
    current.totalBookings += 1;

    if (booking.status === "booked") {
      current.activeBookings += 1;
    }

    byStation.set(stationId, current);
  });

  return [...byStation.values()].sort((a, b) => b.totalBookings - a.totalBookings);
};

export const getUtilizationMetrics = async ({ metric = "platform_summary" } = {}, context) => {
  if (!context.authorization) {
    return {
      needsAuthentication: true,
      message: "Admin analytics requires the user's Authorization header."
    };
  }

  const [analyticsPayload, bookingsPayload] = await Promise.all([
    requestJson({
      baseUrl: env.adminServiceUrl,
      path: "/api/admin/analytics",
      authorization: context.authorization
    }),
    requestJson({
      baseUrl: env.adminServiceUrl,
      path: "/api/admin/bookings",
      authorization: context.authorization
    })
  ]);

  const utilization = summarizeUtilization(bookingsPayload.data || []);

  return {
    metric,
    analytics: analyticsPayload.data,
    utilization,
    highestUtilization: utilization[0] || null
  };
};
