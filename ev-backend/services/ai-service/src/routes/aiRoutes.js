import express from "express";
import { chat } from "../controllers/aiController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router();

router.post("/chat", asyncHandler(chat));

export default router;
