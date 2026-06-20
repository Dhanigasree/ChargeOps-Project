import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { requestJson } from "../services/httpClient.js";

export const createBooking = async ({ stationId, slotTime, amount }, context) => {
  if (!context.authorization) {
    return {
      needsAuthentication: true,
      message: "Booking requires the user's Authorization header."
    };
  }

  const payload = await requestJson({
    baseUrl: env.bookingServiceUrl,
    path: "/api/bookings",
    method: "POST",
    authorization: context.authorization,
    body: {
      stationId,
      slotTime,
      amount
    }
  });

  return payload.data;
};

const hourOf = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.getUTCHours();
};

export const analyzeBookings = async ({ stationId } = {}, context) => {
  if (!context.authorization) {
    return {
      needsAuthentication: true,
      message: "Booking analysis requires the user's Authorization header."
    };
  }

  logger.info({ stationId, userId: context.userId }, "AI tool analyze_bookings invoked");

  const payload = await requestJson({
    baseUrl: env.bookingServiceUrl,
    path: "/api/bookings/me",
    authorization: context.authorization
  });

  const bookings = payload.data || [];
  const relevantBookings = stationId ? bookings.filter((booking) => booking.stationId === stationId) : bookings;
  const byHour = relevantBookings.reduce((acc, booking) => {
    const hour = hourOf(booking.slotTime);
    if (hour !== null) {
      acc[hour] = (acc[hour] || 0) + 1;
    }
    return acc;
  }, {});

  const peakHour = Object.entries(byHour).sort((a, b) => b[1] - a[1])[0] || null;
  const recentStationIds = [...new Set(bookings.map((booking) => booking.stationId).filter(Boolean))].slice(0, 5);

  logger.info({ bookingCount: bookings.length, userId: context.userId }, "AI tool analyze_bookings completed");

  return {
    bookingCount: bookings.length,
    relevantBookingCount: relevantBookings.length,
    recentBookings: bookings.slice(0, 5),
    recentStationIds,
    peakHour: peakHour ? { hour: Number(peakHour[0]), bookings: peakHour[1] } : null
  };
};
