import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { requestJson } from "../services/httpClient.js";

const knownPlaces = {
  velachery: { locality: "OMR", district: "Chennai", state: "Tamil Nadu", lat: 12.9756, lng: 80.2207 },
  "anna nagar": { locality: "T Nagar", district: "Chennai", state: "Tamil Nadu", lat: 13.0878, lng: 80.2104 },
  chennai: { district: "Chennai", state: "Tamil Nadu", lat: 13.0827, lng: 80.2707 },
  bangalore: { district: "Bengaluru Urban", state: "Karnataka", lat: 12.9716, lng: 77.5946 },
  bengaluru: { district: "Bengaluru Urban", state: "Karnataka", lat: 12.9716, lng: 77.5946 },
  hyderabad: { district: "Hyderabad", state: "Telangana", lat: 17.385, lng: 78.4867 },
  mumbai: { district: "Mumbai Suburban", state: "Maharashtra", lat: 19.076, lng: 72.8777 },
  delhi: { state: "Delhi", lat: 28.6139, lng: 77.209 }
};

const toRad = (value) => (Number(value) * Math.PI) / 180;

const distanceKm = (a, b) => {
  if (![a?.lat, a?.lng, b?.lat, b?.lng].every((value) => Number.isFinite(Number(value)))) {
    return null;
  }

  const earthRadiusKm = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

const normalize = (value = "") => String(value).toLowerCase().trim();

const textForStation = (station) =>
  normalize(
    [
      station.name,
      station.chargerType,
      station.location?.locality,
      station.location?.district,
      station.location?.state,
      station.location?.address
    ]
      .filter(Boolean)
      .join(" ")
  );

const inferPlace = (query = "") => {
  const normalized = normalize(query);
  const entry = Object.entries(knownPlaces).find(([name]) => normalized.includes(name));

  return entry?.[1] || null;
};

const scoreStation = (station, { query, place, chargerType, maxPrice, availableOnly, fastOnly }) => {
  const text = textForStation(station);
  const normalizedQuery = normalize(query);
  const queryTerms = normalizedQuery.split(/\s+/).filter((term) => term.length > 2);
  let score = 0;

  if (station.isApproved) {
    score += 20;
  }

  if (Number(station.availability?.slots || 0) > 0) {
    score += 15;
  }

  if (normalizedQuery && text.includes(normalizedQuery)) {
    score += 40;
  }

  score += queryTerms.filter((term) => text.includes(term)).length * 8;

  if (place?.state && normalize(station.location?.state) === normalize(place.state)) {
    score += 20;
  }

  if (place?.district && normalize(station.location?.district) === normalize(place.district)) {
    score += 30;
  }

  if (place?.locality && normalize(station.location?.locality) === normalize(place.locality)) {
    score += 25;
  }

  const distance = distanceKm(place, station.location);
  if (distance !== null) {
    score += Math.max(0, 35 - distance);
  }

  if (chargerType && normalize(station.chargerType).includes(normalize(chargerType))) {
    score += 20;
  }

  if (fastOnly && /fast|dc|ccs/i.test(station.chargerType || "")) {
    score += 18;
  }

  if (maxPrice && Number(station.pricePerUnit) <= Number(maxPrice)) {
    score += 10;
  }

  if (availableOnly && Number(station.availability?.slots || 0) <= 0) {
    score -= 100;
  }

  if (maxPrice && Number(station.pricePerUnit) > Number(maxPrice)) {
    score -= 100;
  }

  return {
    ...station,
    matchScore: Number(score.toFixed(2)),
    distanceKm: distance === null ? null : Number(distance.toFixed(1))
  };
};

export const searchStations = async ({ query, chargerType, maxPrice, availableOnly = true, fastOnly = false } = {}) => {
  logger.info({ query, chargerType, maxPrice, availableOnly, fastOnly }, "AI tool search_stations invoked");

  const directPayload = await requestJson({
    baseUrl: env.stationServiceUrl,
    path: "/api/stations",
    query: {
      q: query,
      chargerType,
      maxPrice,
      isApproved: true
    }
  });

  const place = inferPlace(query);
  const shouldBroaden = Boolean(!directPayload.data?.length && (query || chargerType || maxPrice || availableOnly || fastOnly));
  const payload = shouldBroaden
    ? await requestJson({
        baseUrl: env.stationServiceUrl,
        path: "/api/stations",
        query: {
          isApproved: true
        }
      })
    : directPayload;

  const rankedStations = (payload.data || [])
    .map((station) => scoreStation(station, { query, place, chargerType, maxPrice, availableOnly, fastOnly }))
    .filter((station) => station.matchScore > -50)
    .filter((station) => !place || station.distanceKm === null || station.distanceKm <= 100 || normalize(station.location?.district) === normalize(place.district))
    .sort((a, b) => b.matchScore - a.matchScore || Number(b.availability?.slots || 0) - Number(a.availability?.slots || 0));

  logger.info({ query, resultCount: rankedStations.length, broadened: shouldBroaden }, "AI tool search_stations completed");

  return {
    count: rankedStations.length,
    sourceCount: payload.data?.length || 0,
    broadened: shouldBroaden,
    inferredPlace: place,
    stations: rankedStations.slice(0, 8)
  };
};
