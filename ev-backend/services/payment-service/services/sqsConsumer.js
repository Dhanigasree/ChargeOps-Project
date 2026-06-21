import { DeleteMessageCommand, ReceiveMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { env } from "../config/env.js";

const sqsClient = new SQSClient({ region: env.awsRegion });

export const receiveMessages = async ({ queueUrl }) => {
  const response = await sqsClient.send(
    new ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: env.sqsMaxMessages,
      WaitTimeSeconds: env.sqsWaitTimeSeconds,
      VisibilityTimeout: env.sqsVisibilityTimeoutSeconds,
      MessageAttributeNames: ["All"],
      AttributeNames: ["All"]
    })
  );

  return response.Messages || [];
};

export const deleteMessage = async ({ queueUrl, receiptHandle }) => {
  await sqsClient.send(
    new DeleteMessageCommand({
      QueueUrl: queueUrl,
      ReceiptHandle: receiptHandle
    })
  );
};

export const parseMessageBody = (message) => JSON.parse(message.Body || "{}");
