import mongoose from "mongoose";

const userAiPreferenceSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    favoriteLocations: {
      type: [String],
      default: []
    },
    preferredChargingHours: {
      type: [Number],
      default: []
    },
    frequentlyVisitedStations: {
      type: [String],
      default: []
    },
    lastIntent: {
      type: String,
      default: ""
    }
  },
  {
    collection: "user_ai_preferences",
    timestamps: true,
    versionKey: false
  }
);

const UserAiPreference = mongoose.model("UserAiPreference", userAiPreferenceSchema);

export default UserAiPreference;
