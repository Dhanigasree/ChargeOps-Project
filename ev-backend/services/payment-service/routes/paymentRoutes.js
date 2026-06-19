import express from "express";
import {
  createMockPayment,
  createPayment,
  getAllPayments,
  getPaymentById,
  getUserPayments,
  verifyStripeSession
} from "../controllers/paymentController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { createMockPaymentSchema, createPaymentSchema, paymentIdSchema, verifyStripeSessionSchema } from "../middleware/validationSchemas.js";

const router = express.Router();

router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Payment service is running"
  });
});

router.post("/create", authenticate, authorize("customer", "admin"), validateRequest(createPaymentSchema), asyncHandler(createPayment));
router.post("/mock-pay", authenticate, authorize("customer", "admin"), validateRequest(createMockPaymentSchema), asyncHandler(createMockPayment));
router.get("/checkout/verify", authenticate, validateRequest(verifyStripeSessionSchema), asyncHandler(verifyStripeSession));
router.get("/me", authenticate, authorize("customer", "admin"), asyncHandler(getUserPayments));
router.get("/admin/all", authenticate, authorize("admin"), asyncHandler(getAllPayments));
router.get("/:id", authenticate, validateRequest(paymentIdSchema), asyncHandler(getPaymentById));

export default router;
