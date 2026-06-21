import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { env } from "../config/env.js";

const sqsClient = new SQSClient({ region: env.awsRegion });

const log = (event, details = {}) => {
  console.info(JSON.stringify({ event, service: "payment-service", ...details }));
};

const publishToQueue = async ({ queueUrl, payload, queueName }) => {
  if (!queueUrl) {
    log("sqs_publish_skipped", { queueName, reason: "queue_url_not_configured", eventType: payload.type });
    return false;
  }

  const response = await sqsClient.send(
    new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(payload),
      MessageAttributes: {
        eventType: {
          DataType: "String",
          StringValue: payload.type
        },
        source: {
          DataType: "String",
          StringValue: payload.source
        }
      }
    })
  );

  log("sqs_publish_success", {
    queueName,
    eventType: payload.type,
    messageId: response.MessageId,
    aggregateId: payload.aggregateId
  });
  return true;
};

export const publishChargeOpsEvent = async ({ type, aggregateId, userId, data }) => {
  const payload = {
    id: `${type}-${aggregateId}-${Date.now()}`,
    type,
    source: "payment-service",
    aggregateId,
    userId,
    data,
    occurredAt: new Date().toISOString()
  };

  try {
    await publishToQueue({ queueUrl: env.sqsQueueUrl, payload, queueName: "chargeops-events" });
    await publishToQueue({ queueUrl: env.sqsNotificationQueueUrl, payload, queueName: "chargeops-notifications" });
    return true;
  } catch (error) {
    log("sqs_publish_failed", {
      eventType: type,
      aggregateId,
      error: error.message
    });
    return false;
  }
};
