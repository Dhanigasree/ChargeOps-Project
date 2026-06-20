import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { buildAiInsights } from "./insightService.js";

const s3Client = new S3Client({ region: env.awsRegion });

const renderMonthlyReport = ({ userId, insights }) => `# ChargeOps AI Monthly EV Report

User: ${userId}
Generated: ${new Date().toISOString()}

## Executive Summary
- Recommended Station: ${insights.recommendedStation?.name || "Not enough station data yet"}
- Monthly Spend: ${Number(insights.monthlySpend || 0).toFixed(2)} ${String(insights.currency || "usd").toUpperCase()}
- CO2 Saved: ${Number(insights.co2SavedKg || 0).toFixed(2)} kg
- Peak Usage Signal: ${insights.peakUsageTime}
- Predicted Next Booking: ${insights.predictedNextBooking}

## Why These Recommendations Were Made
- Station: ${insights.explainability?.recommendedStation || "No station explanation available"}
- Booking: ${insights.explainability?.booking || "No booking explanation available"}
- Sustainability: ${insights.explainability?.sustainability || "No sustainability explanation available"}

## Utilization Heatmap
${(insights.utilizationHeatmap || []).map((item) => `- ${item.stationId}: ${item.value} booking(s)`).join("\n") || "- No utilization data yet"}

## Personalized Signals
- Favorite locations: ${(insights.preferences?.favoriteLocations || []).join(", ") || "Learning from future conversations"}
- Preferred charging hours: ${(insights.preferences?.preferredChargingHours || []).join(", ") || "Learning from future bookings"}
- Frequent stations: ${(insights.preferences?.frequentlyVisitedStations || []).join(", ") || "Learning from future activity"}
`;

export const generateMonthlyReport = async ({ context }) => {
  const insights = await buildAiInsights({ context });
  const report = renderMonthlyReport({ userId: context.userId, insights });
  const key = `ai-reports/${context.userId}/${new Date().toISOString().slice(0, 7)}.md`;

  if (!env.reportsBucketName) {
    return {
      stored: false,
      reason: "REPORTS_BUCKET_NAME is not configured",
      key,
      report,
      insights
    };
  }

  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: env.reportsBucketName,
        Key: key,
        Body: report,
        ContentType: "text/markdown",
        Metadata: {
          userId: context.userId
        }
      })
    );

    return {
      stored: true,
      bucket: env.reportsBucketName,
      key,
      s3Uri: `s3://${env.reportsBucketName}/${key}`,
      report,
      insights
    };
  } catch (error) {
    logger.warn({ err: error, userId: context.userId, bucket: env.reportsBucketName }, "Failed to store AI monthly report in S3");
    return {
      stored: false,
      reason: error.message,
      key,
      report,
      insights
    };
  }
};
