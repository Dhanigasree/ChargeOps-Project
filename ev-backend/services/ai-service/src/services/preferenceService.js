import mongoose from "mongoose";
import { logger } from "../config/logger.js";
import UserAiPreference from "../models/UserAiPreference.js";

const uniqueLimit = (values, limit = 10) => [...new Set(values.filter(Boolean))].slice(0, limit);

const locationFromMessage = (message = "") => {
  const match = message.match(/\b(?:near|in|at)\s+([a-zA-Z0-9\s-]{3,60})/i);
  return match?.[1]?.replace(/[?.!,].*$/, "").trim();
};

const hourFromMessage = (message = "") => {
  const match = message.match(/\b(\d{1,2})(?::\d{2})?\s*(am|pm)?\b/i);
  if (!match) {
    return null;
  }

  let hour = Number(match[1]);
  const meridiem = match[2]?.toLowerCase();
  if (!Number.isFinite(hour) || hour > 23) {
    return null;
  }
  if (meridiem === "pm" && hour < 12) {
    hour += 12;
  }
  if (meridiem === "am" && hour === 12) {
    hour = 0;
  }
  return hour;
};

export const getUserPreferences = async (userId) => {
  if (mongoose.connection.readyState !== 1) {
    return null;
  }

  return UserAiPreference.findOne({ userId }).lean();
};

export const updatePreferencesFromTurn = async ({ userId, message, intent, structuredData }) => {
  if (mongoose.connection.readyState !== 1 || !userId) {
    return null;
  }

  try {
    const existing = (await UserAiPreference.findOne({ userId }).lean()) || {};
    const location = locationFromMessage(message);
    const hour = hourFromMessage(message);
    const stationIds = structuredData?.stations?.map((station) => station.id || station._id).filter(Boolean) || [];

    const preference = await UserAiPreference.findOneAndUpdate(
      { userId },
      {
        $set: {
          favoriteLocations: uniqueLimit([location, ...(existing.favoriteLocations || [])]),
          preferredChargingHours: uniqueLimit([hour, ...(existing.preferredChargingHours || [])]),
          frequentlyVisitedStations: uniqueLimit([...stationIds, ...(existing.frequentlyVisitedStations || [])]),
          lastIntent: intent || existing.lastIntent || ""
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    return preference;
  } catch (error) {
    logger.warn({ err: error, userId }, "Failed to update AI user preferences");
    return null;
  }
};
