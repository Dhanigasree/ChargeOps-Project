import express from "express";
import {
  aiHealth,
  chat,
  optimizeBooking,
  optimizeChargingCost,
  recommendStation,
  usageAnalytics
} from "../controllers/aiController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router();

router.get("/health", asyncHandler(aiHealth));
router.post("/chat", asyncHandler(chat));
router.post("/recommend-station", asyncHandler(recommendStation));
router.post("/optimize-booking", asyncHandler(optimizeBooking));
router.post("/optimize-cost", asyncHandler(optimizeChargingCost));
router.get("/usage-analytics", asyncHandler(usageAnalytics));

export default router;
