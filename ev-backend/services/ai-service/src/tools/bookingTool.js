import { env } from "../config/env.js";
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
