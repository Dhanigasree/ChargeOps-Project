import { env } from "../config/env.js";
import Counter from "../models/Counter.js";
import Invoice from "../models/Invoice.js";
import Payment from "../models/Payment.js";
import { buildInvoiceS3Key, createInvoicePresignedUrl, uploadInvoicePdf } from "./s3InvoiceStorage.js";
import { generateInvoicePdf } from "./invoicePdfService.js";

const log = (event, details = {}) => {
  console.info(JSON.stringify({ event, service: "payment-service", ...details }));
};

const jsonFetch = async ({ url, authorization, serviceKey }) => {
  const headers = {
    Accept: "application/json"
  };

  if (authorization) {
    headers.Authorization = authorization;
  }

  if (serviceKey) {
    headers["x-service-key"] = serviceKey;
  }

  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(8000)
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json().catch(() => null);
  return payload?.data || null;
};

const getInvoiceNumber = async (payment) => {
  if (payment.invoiceNumber) {
    return payment.invoiceNumber;
  }

  const year = new Date().getUTCFullYear();
  const counter = await Counter.findOneAndUpdate(
    { key: `invoice-${year}` },
    { $inc: { value: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return `INV-${year}-${String(counter.value).padStart(6, "0")}`;
};

const loadInvoiceContext = async ({ payment, authorization }) => {
  const [user, bookings] = await Promise.all([
    authorization ? jsonFetch({ url: `${env.userServiceUrl}/api/users/me`, authorization }) : null,
    authorization ? jsonFetch({ url: `${env.bookingServiceUrl}/api/bookings/me`, authorization }) : null
  ]);

  const booking = Array.isArray(bookings) ? bookings.find((entry) => String(entry.id) === String(payment.bookingId)) : null;
  const station = booking?.stationId
    ? await jsonFetch({ url: `${env.stationServiceUrl}/api/stations/${booking.stationId}`, authorization })
    : null;

  return { user, booking, station };
};

export const ensureInvoiceForPayment = async ({ payment, authorization }) => {
  if (payment.status !== "success") {
    return payment;
  }

  const existingInvoice = await Invoice.findOne({ paymentId: payment._id });
  if (existingInvoice) {
    existingInvoice.invoiceUrl = await createInvoicePresignedUrl({ key: existingInvoice.invoiceS3Key });
    await existingInvoice.save();
    payment.invoiceNumber = existingInvoice.invoiceNumber;
    payment.s3Key = existingInvoice.invoiceS3Key;
    payment.invoiceUrl = existingInvoice.invoiceUrl;
    payment.invoiceCreatedAt = existingInvoice.createdAt;
    payment.stationName = existingInvoice.stationName || payment.stationName || "ChargeOps Station";
    await payment.save();
    log("invoice_existing_returned", { paymentId: String(payment._id), invoiceNumber: payment.invoiceNumber });
    return payment;
  }

  payment.invoiceNumber = await getInvoiceNumber(payment);
  payment.invoiceCreatedAt = payment.invoiceCreatedAt || new Date();
  log("invoice_number_generated", {
    paymentId: String(payment._id),
    invoiceNumber: payment.invoiceNumber,
    userId: payment.userId,
    bookingId: payment.bookingId
  });

  const s3Key = buildInvoiceS3Key({
    userId: payment.userId,
    invoiceNumber: payment.invoiceNumber
  });
  const invoiceUrl = await createInvoicePresignedUrl({ key: s3Key }).catch(() => "");
  const context = await loadInvoiceContext({ payment, authorization });
  const pdfBuffer = await generateInvoicePdf({
    payment,
    invoiceUrl,
    ...context
  });
  log("invoice_pdf_generated", { paymentId: String(payment._id), invoiceNumber: payment.invoiceNumber, bytes: pdfBuffer.length });

  await uploadInvoicePdf({ key: s3Key, pdfBuffer });
  log("invoice_s3_upload_success", { paymentId: String(payment._id), invoiceNumber: payment.invoiceNumber, s3Key });

  payment.s3Key = s3Key;
  payment.invoiceUrl = await createInvoicePresignedUrl({ key: s3Key });
  payment.stationName = context.station?.name || "ChargeOps Station";
  await payment.save();
  log("payment_invoice_update_success", { paymentId: String(payment._id), invoiceNumber: payment.invoiceNumber });

  const invoice = await Invoice.findOneAndUpdate(
    { paymentId: payment._id },
    {
      paymentId: payment._id,
      invoiceNumber: payment.invoiceNumber,
      invoiceS3Key: s3Key,
      invoiceUrl: payment.invoiceUrl,
      userId: payment.userId,
      bookingId: payment.bookingId,
      stationName: context.station?.name || "ChargeOps Station",
      amount: payment.amount,
      currency: payment.currency,
      status: "generated"
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  log("invoice_mongodb_insert_success", { invoiceId: String(invoice._id), paymentId: String(payment._id), invoiceNumber: invoice.invoiceNumber });

  return payment;
};

const createInvoiceDocumentFromPayment = async (payment) => {
  const invoice = await Invoice.findOneAndUpdate(
    { paymentId: payment._id },
    {
      paymentId: payment._id,
      invoiceNumber: payment.invoiceNumber,
      invoiceS3Key: payment.s3Key,
      invoiceUrl: payment.invoiceUrl,
      userId: payment.userId,
      bookingId: payment.bookingId,
      stationName: payment.stationName || "ChargeOps Station",
      amount: payment.amount,
      currency: payment.currency,
      status: "generated"
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  log("invoice_mongodb_backfill_success", { invoiceId: String(invoice._id), paymentId: String(payment._id), invoiceNumber: invoice.invoiceNumber });
  return invoice;
};

export const getInvoiceForUser = async ({ invoiceId, user }) => {
  const query = invoiceId.match(/^[0-9a-fA-F]{24}$/)
    ? { $or: [{ _id: invoiceId }, { invoiceNumber: invoiceId }] }
    : { invoiceNumber: invoiceId };
  const payment = await Payment.findOne(query);

  if (!payment) {
    return null;
  }

  if (user.role !== "admin" && payment.userId !== user.id) {
    const error = new Error("You are not allowed to access this invoice");
    error.statusCode = 403;
    throw error;
  }

  if (!payment.s3Key || !(await Invoice.exists({ paymentId: payment._id }))) {
    await ensureInvoiceForPayment({ payment });
  }

  payment.invoiceUrl = await createInvoicePresignedUrl({ key: payment.s3Key });
  return payment;
};

export const getInvoiceDocumentForUser = async ({ invoiceId, user }) => {
  const query = invoiceId.match(/^[0-9a-fA-F]{24}$/)
    ? { $or: [{ _id: invoiceId }, { paymentId: invoiceId }] }
    : { invoiceNumber: invoiceId };
  let invoice = await Invoice.findOne(query);

  if (!invoice) {
    const payment = await getInvoiceForUser({ invoiceId, user });
    if (!payment) {
      return null;
    }
    invoice = await Invoice.findOne({ paymentId: payment._id });
    if (!invoice && payment.s3Key && payment.invoiceNumber) {
      invoice = await createInvoiceDocumentFromPayment(payment);
    }
  }

  if (!invoice) {
    return null;
  }

  if (user.role !== "admin" && invoice.userId !== user.id) {
    const error = new Error("You are not allowed to access this invoice");
    error.statusCode = 403;
    throw error;
  }

  invoice.invoiceUrl = await createInvoicePresignedUrl({ key: invoice.invoiceS3Key });
  await invoice.save();
  return invoice;
};
