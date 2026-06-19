import express from "express";
import proxy from "express-http-proxy";
import { env } from "../config/env.js";

const router = express.Router();

const createProxy = (target) =>
  proxy(target, {
    proxyReqPathResolver: (req) => req.originalUrl,
    proxyErrorHandler: (error, res, next) => {
      res.status(502).json({
        success: false,
        message: "Upstream service unavailable",
        details: error.message
      });
    }
  });

router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API Gateway is running"
  });
});

router.use("/api/auth", createProxy(env.services.auth));
router.use("/api/users", createProxy(env.services.user));
router.use("/api/stations", createProxy(env.services.station));
router.use("/api/bookings", createProxy(env.services.booking));
router.use("/api/payments", createProxy(env.services.payment));
router.use("/api/reviews", createProxy(env.services.review));
router.use("/api/admin", createProxy(env.services.admin));
router.use("/api/ai", createProxy(env.services.ai));

export default router;
