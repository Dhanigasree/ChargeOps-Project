import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { requestJson } from "../services/httpClient.js";

export const getStationReviews = async ({ stationId }) => {
  logger.info({ stationId }, "AI tool get_station_reviews invoked");

  const payload = await requestJson({
    baseUrl: env.reviewServiceUrl,
    path: `/api/reviews/${stationId}`
  });

  const reviews = payload.data || [];
  const ratings = reviews.map((review) => Number(review.rating)).filter(Number.isFinite);
  const averageRating = ratings.length ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : null;
  const positiveReviews = reviews.filter((review) => Number(review.rating) >= 4).length;
  const negativeReviews = reviews.filter((review) => Number(review.rating) <= 2).length;

  logger.info({ stationId, reviewCount: reviews.length }, "AI tool get_station_reviews completed");

  return {
    count: reviews.length,
    averageRating: averageRating === null ? null : Number(averageRating.toFixed(2)),
    sentiment: positiveReviews >= negativeReviews ? "positive_or_neutral" : "negative",
    reviews
  };
};
