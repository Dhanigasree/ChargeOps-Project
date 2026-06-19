import { env } from "../config/env.js";
import { requestJson } from "../services/httpClient.js";

export const getStationReviews = async ({ stationId }) => {
  const payload = await requestJson({
    baseUrl: env.reviewServiceUrl,
    path: `/api/reviews/${stationId}`
  });

  return {
    count: payload.data?.length || 0,
    reviews: payload.data || []
  };
};
