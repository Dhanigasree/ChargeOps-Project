import { env } from "../config/env.js";
import { requestJson } from "../services/httpClient.js";

const periodStart = (period) => {
  const now = new Date();

  if (period === "this_month" || period === "month") {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }

  if (period === "last_month") {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  }

  return null;
};

const periodEnd = (period) => {
  const now = new Date();

  if (period === "last_month") {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }

  return null;
};

export const getSpendingHistory = async ({ period = "this_month" } = {}, context) => {
  if (!context.authorization) {
    return {
      needsAuthentication: true,
      message: "Spending history requires the user's Authorization header."
    };
  }

  const payload = await requestJson({
    baseUrl: env.paymentServiceUrl,
    path: "/api/payments/me",
    authorization: context.authorization
  });

  const start = periodStart(period);
  const end = periodEnd(period);
  const payments = (payload.data || []).filter((payment) => {
    const paidAt = new Date(payment.createdAt || payment.updatedAt || 0);
    return payment.status === "success" && (!start || paidAt >= start) && (!end || paidAt < end);
  });

  return {
    period,
    total: payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    currency: payments[0]?.currency || "usd",
    payments
  };
};
