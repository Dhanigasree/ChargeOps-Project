import { connectDatabase } from "../config/database.js";
import { env } from "../config/env.js";
import Notification from "../models/Notification.js";
import { deleteMessage, parseMessageBody, receiveMessages } from "../services/sqsConsumer.js";

const log = (event, details = {}) => {
  console.info(JSON.stringify({ event, service: "notification-worker", ...details }));
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const notificationCopy = (event) => {
  if (event.type === "PAYMENT_SUCCESS") {
    return {
      title: "Payment completed",
      message: `Payment ${event.aggregateId} completed successfully. Your invoice will be generated shortly.`
    };
  }

  if (event.type === "BOOKING_CREATED") {
    return {
      title: "Booking created",
      message: `Booking ${event.aggregateId} was created successfully.`
    };
  }

  return {
    title: "ChargeOps event",
    message: `${event.type || "Event"} was processed by ChargeOps.`
  };
};

const processMessage = async (message) => {
  const event = parseMessageBody(message);
  const copy = notificationCopy(event);

  const notification = await Notification.findOneAndUpdate(
    { eventId: event.id },
    {
      eventId: event.id,
      type: event.type,
      userId: event.userId || event.data?.userId || "",
      source: event.source || "chargeops",
      aggregateId: event.aggregateId,
      title: copy.title,
      message: copy.message,
      payload: event
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  log("notification_worker_notification_saved", {
    eventId: event.id,
    notificationId: String(notification._id),
    eventType: event.type,
    userId: notification.userId
  });
};

const run = async () => {
  if (!env.sqsNotificationQueueUrl) {
    throw new Error("SQS_NOTIFICATION_QUEUE_URL is required for notification-worker");
  }

  await connectDatabase();
  log("notification_worker_started", { queueUrl: env.sqsNotificationQueueUrl });

  while (true) {
    try {
      const messages = await receiveMessages({ queueUrl: env.sqsNotificationQueueUrl });

      for (const message of messages) {
        try {
          await processMessage(message);
          await deleteMessage({ queueUrl: env.sqsNotificationQueueUrl, receiptHandle: message.ReceiptHandle });
          log("notification_worker_message_deleted", { messageId: message.MessageId });
        } catch (error) {
          log("notification_worker_message_failed", { messageId: message.MessageId, error: error.message });
        }
      }
    } catch (error) {
      log("notification_worker_poll_failed", { error: error.message });
      await sleep(5000);
    }
  }
};

run().catch((error) => {
  log("notification_worker_fatal", { error: error.message, stack: error.stack });
  process.exit(1);
});
