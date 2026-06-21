import { connectDatabase } from "../config/database.js";
import { env } from "../config/env.js";
import Payment from "../models/Payment.js";
import { ensureInvoiceForPayment } from "../services/invoiceService.js";
import { deleteMessage, parseMessageBody, receiveMessages } from "../services/sqsConsumer.js";

const log = (event, details = {}) => {
  console.info(JSON.stringify({ event, service: "invoice-worker", ...details }));
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const handlePaymentSuccess = async (event) => {
  const paymentId = event.data?.id || event.aggregateId;
  const payment = await Payment.findById(paymentId);

  if (!payment) {
    throw new Error(`Payment not found for event ${event.id}`);
  }

  if (payment.status !== "success") {
    log("invoice_worker_payment_not_success", { eventId: event.id, paymentId, status: payment.status });
    return;
  }

  await ensureInvoiceForPayment({ payment });
  log("invoice_worker_invoice_generated", {
    eventId: event.id,
    paymentId,
    invoiceNumber: payment.invoiceNumber,
    invoiceS3Key: payment.s3Key
  });
};

const processMessage = async (message) => {
  const event = parseMessageBody(message);

  if (event.type !== "PAYMENT_SUCCESS") {
    log("invoice_worker_event_ignored", { eventId: event.id, eventType: event.type });
    return;
  }

  await handlePaymentSuccess(event);
};

const run = async () => {
  if (!env.sqsQueueUrl) {
    throw new Error("SQS_QUEUE_URL is required for invoice-worker");
  }

  await connectDatabase();
  log("invoice_worker_started", { queueUrl: env.sqsQueueUrl });

  while (true) {
    try {
      const messages = await receiveMessages({ queueUrl: env.sqsQueueUrl });

      for (const message of messages) {
        try {
          await processMessage(message);
          await deleteMessage({ queueUrl: env.sqsQueueUrl, receiptHandle: message.ReceiptHandle });
          log("invoice_worker_message_deleted", { messageId: message.MessageId });
        } catch (error) {
          log("invoice_worker_message_failed", { messageId: message.MessageId, error: error.message });
        }
      }
    } catch (error) {
      log("invoice_worker_poll_failed", { error: error.message });
      await sleep(5000);
    }
  }
};

run().catch((error) => {
  log("invoice_worker_fatal", { error: error.message, stack: error.stack });
  process.exit(1);
});
