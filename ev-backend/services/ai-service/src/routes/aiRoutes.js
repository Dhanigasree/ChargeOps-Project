import express from "express";
import {
  aiHealth,
  aiInsights,
  chat,
  debug,
  getHistorySession,
  listAgentArchitecture,
  listTools,
  listHistory,
  monthlyReport,
  optimizeBooking,
  optimizeChargingCost,
  recommendStation,
  removeHistorySession,
  usageAnalytics
} from "../controllers/aiController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router();

router.get("/health", asyncHandler(aiHealth));
router.get("/tools", asyncHandler(listTools));
router.get("/agents", asyncHandler(listAgentArchitecture));
router.get("/insights", asyncHandler(aiInsights));
router.get("/debug", asyncHandler(debug));
router.get("/history", asyncHandler(listHistory));
router.get("/history/:sessionId", asyncHandler(getHistorySession));
router.delete("/history/:sessionId", asyncHandler(removeHistorySession));
router.post("/chat", asyncHandler(chat));
router.post("/reports/monthly", asyncHandler(monthlyReport));
router.post("/recommend", asyncHandler(recommendStation));
router.post("/stations", asyncHandler(recommendStation));
router.post("/predict", asyncHandler(optimizeBooking));
router.post("/recommend-station", asyncHandler(recommendStation));
router.post("/optimize-booking", asyncHandler(optimizeBooking));
router.post("/optimize-cost", asyncHandler(optimizeChargingCost));
router.get("/usage-analytics", asyncHandler(usageAnalytics));

export default router;
