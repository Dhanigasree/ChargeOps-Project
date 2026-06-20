import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { getCollection } from "../services/dataStore.js";
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
  logger.info({ metric, userId: context.userId }, "AI tool get_utilization_metrics invoked");

  let source = context.authorization ? "admin-service" : "analytics-db-fallback";
  let analytics;
  let bookings;

  try {
    if (!context.authorization) {
      throw new Error("Admin service requires authorization; using analytics fallback");
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
    analytics = analyticsPayload.data;
    bookings = bookingsPayload.data || [];
  } catch (error) {
    source = "analytics-db-fallback";
    logger.warn({ err: error, userId: context.userId }, "Admin service lookup failed, using read-only analytics database fallback");

    const [bookingCollection, paymentCollection] = await Promise.all([
      getCollection("ev-booking-service", "bookings"),
      getCollection("ev-payment-service", "payments")
    ]);
    bookings = await bookingCollection.find({}).sort({ createdAt: -1 }).limit(500).toArray();
    const payments = await paymentCollection.find({}).sort({ createdAt: -1 }).limit(500).toArray();
    const successfulPayments = payments.filter((payment) => payment.status === "success");
    analytics = {
      totalBookings: bookings.length,
      totalRevenue: successfulPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
      successfulPayments: successfulPayments.length
    };
  }

  const utilization = summarizeUtilization(bookings || []);

  logger.info({ metric, source, utilizationCount: utilization.length }, "AI tool get_utilization_metrics completed");

  return {
    metric,
    source,
    analytics,
    utilization,
    highestUtilization: utilization[0] || null
  };
};
