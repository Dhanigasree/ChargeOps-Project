import { env } from "../config/env.js";
import { requestJson } from "../services/httpClient.js";

export const searchStations = async ({ query, chargerType, maxPrice } = {}) => {
  const payload = await requestJson({
    baseUrl: env.stationServiceUrl,
    path: "/api/stations",
    query: {
      q: query,
      chargerType,
      maxPrice,
      isApproved: true
    }
  });

  return {
    count: payload.data?.length || 0,
    stations: (payload.data || []).slice(0, 8)
  };
};
