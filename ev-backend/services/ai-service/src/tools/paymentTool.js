import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { getCollection, userIdFromContext } from "../services/dataStore.js";
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

  logger.info({ period, userId: context.userId }, "AI tool get_spending_history invoked");

  let source = "payment-service";
  let rawPayments = [];

  try {
    const payload = await requestJson({
      baseUrl: env.paymentServiceUrl,
      path: "/api/payments/me",
      authorization: context.authorization
    });
    rawPayments = payload.data || [];
  } catch (error) {
    source = "payment-db-fallback";
    logger.warn({ err: error, userId: context.userId }, "Payment service lookup failed, using read-only payment database fallback");

    const payments = await getCollection("ev-payment-service", "payments");
    rawPayments = await payments
      .find({ userId: userIdFromContext(context) })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();
  }

  const start = periodStart(period);
  const end = periodEnd(period);
  const payments = rawPayments.filter((payment) => {
    const paidAt = new Date(payment.createdAt || payment.updatedAt || 0);
    return payment.status === "success" && (!start || paidAt >= start) && (!end || paidAt < end);
  });

  const allSuccessfulPayments = rawPayments.filter((payment) => payment.status === "success");
  const totalAllTime = allSuccessfulPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const total = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  logger.info({ period, userId: context.userId, source, paymentCount: payments.length, total }, "AI tool get_spending_history completed");

  return {
    period,
    total,
    totalAllTime,
    currency: payments[0]?.currency || "usd",
    payments,
    source
  };
};
