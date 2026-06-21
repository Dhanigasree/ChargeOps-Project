import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../config/env.js";

const s3Client = new S3Client({ region: env.awsRegion });

export const getInvoiceBucketName = () => {
  if (!env.s3BucketName) {
    const error = new Error("S3_BUCKET_NAME is required for payment invoice storage");
    error.statusCode = 500;
    throw error;
  }

  return env.s3BucketName;
};

export const buildInvoiceS3Key = ({ userId, invoiceNumber }) =>
  `users/${userId}/invoice_${invoiceNumber}.pdf`;

export const uploadInvoicePdf = async ({ key, pdfBuffer }) => {
  const bucket = getInvoiceBucketName();

  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: pdfBuffer,
      ContentType: "application/pdf",
      Metadata: {
        application: "chargeops",
        documentType: "payment-invoice"
      }
    })
  );
};

export const createInvoicePresignedUrl = async ({ key, expiresIn = env.s3PresignedUrlExpiresSeconds } = {}) => {
  const bucket = getInvoiceBucketName();

  return getSignedUrl(
    s3Client,
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseContentType: "application/pdf"
    }),
    { expiresIn }
  );
};
