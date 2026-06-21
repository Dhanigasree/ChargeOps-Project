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
  if (!context.authorization && !context.userId) {
    return {
      needsAuthentication: true,
      message: "Spending history requires the user's Authorization header."
    };
  }

  logger.info({ period, userId: context.userId }, "AI tool get_spending_history invoked");

  let source = context.authorization ? "payment-service" : "payment-db-fallback";
  let rawPayments = [];

  try {
    if (!context.authorization) {
      throw new Error("Payment service requires authorization; using payment database fallback");
    }

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

export const getLatestInvoice = async (_input = {}, context) => {
  if (!context.authorization && !context.userId) {
    return {
      needsAuthentication: true,
      message: "Invoice lookup requires the user's Authorization header."
    };
  }

  logger.info({ userId: context.userId }, "AI tool get_latest_invoice invoked");

  if (context.authorization) {
    const payload = await requestJson({
      baseUrl: env.paymentServiceUrl,
      path: "/api/payments/history",
      authorization: context.authorization
    });
    const latest = (payload.data || []).find((payment) => payment.status === "success" && payment.invoiceNumber);

    if (!latest) {
      return {
        message: "No generated invoice was found for your successful payments yet."
      };
    }

    const invoicePayload = await requestJson({
      baseUrl: env.paymentServiceUrl,
      path: `/api/payments/invoice/${latest.invoiceNumber || latest.id}`,
      authorization: context.authorization
    });

    return {
      invoice: invoicePayload.data,
      message: `Latest invoice ${invoicePayload.data.invoiceNumber} is ready. Use the secure download URL before it expires.`
    };
  }

  const payments = await getCollection("ev-payment-service", "payments");
  const latest = await payments.findOne(
    {
      userId: userIdFromContext(context),
      status: "success",
      invoiceNumber: { $exists: true, $ne: "" }
    },
    {
      sort: { createdAt: -1 }
    }
  );

  return latest
    ? {
        invoice: latest,
        message: `Latest invoice ${latest.invoiceNumber} was found. Sign in through the app to generate a secure download link.`
      }
    : {
        message: "No generated invoice was found for your successful payments yet."
      };
};

export const getPaymentInvoices = async ({ period = "all_time" } = {}, context) => {
  if (!context.authorization && !context.userId) {
    return {
      needsAuthentication: true,
      message: "Invoice lookup requires the user's Authorization header."
    };
  }

  logger.info({ userId: context.userId, period }, "AI tool get_payment_invoices invoked");

  let rawPayments = [];
  let source = "payment-service";

  try {
    if (!context.authorization) {
      throw new Error("Payment service requires authorization; using payment database fallback");
    }

    const payload = await requestJson({
      baseUrl: env.paymentServiceUrl,
      path: "/api/payments/history",
      authorization: context.authorization
    });
    rawPayments = payload.data || [];
  } catch (error) {
    source = "payment-db-fallback";
    logger.warn({ err: error, userId: context.userId }, "Payment invoice service lookup failed, using read-only payment database fallback");

    const payments = await getCollection("ev-payment-service", "payments");
    rawPayments = await payments
      .find({ userId: userIdFromContext(context) })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();
  }

  const start = periodStart(period);
  const end = periodEnd(period);
  const invoices = rawPayments
    .filter((payment) => {
      const paidAt = new Date(payment.createdAt || payment.updatedAt || 0);
      return payment.status === "success" && payment.invoiceNumber && (!start || paidAt >= start) && (!end || paidAt < end);
    })
    .map((payment) => ({
      paymentId: payment.id || payment._id,
      invoiceNumber: payment.invoiceNumber,
      bookingId: payment.bookingId,
      stationName: payment.stationName || "ChargeOps Station",
      amount: payment.amount,
      currency: payment.currency || "usd",
      status: payment.status,
      invoiceUrl: payment.invoiceUrl || "",
      createdAt: payment.createdAt
    }));

  const total = invoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);

  logger.info({ userId: context.userId, period, source, invoiceCount: invoices.length, total }, "AI tool get_payment_invoices completed");

  return {
    period,
    source,
    invoiceCount: invoices.length,
    total,
    currency: invoices[0]?.currency || "usd",
    invoices
  };
};
