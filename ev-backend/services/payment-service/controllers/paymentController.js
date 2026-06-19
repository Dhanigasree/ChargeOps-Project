import { env } from "../config/env.js";
import { getStripeClient } from "../config/stripe.js";
import Payment from "../models/Payment.js";

const updateBookingPaymentStatus = async (bookingId, paymentStatus) => {
  const response = await fetch(`${env.bookingServiceUrl}/api/bookings/${bookingId}/payment-status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-service-key": env.internalServiceApiKey
    },
    body: JSON.stringify({ paymentStatus }),
    signal: AbortSignal.timeout(10000)
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const error = new Error(payload?.message || "Failed to update booking payment status");
    error.statusCode = response.status;
    throw error;
  }
};

export const createPayment = async (req, res) => {
  if (req.body.paymentMethod !== "card") {
    return res.status(400).json({
      success: false,
      message: "Only card payments are supported with the current Stripe integration"
    });
  }

  const existingPayment = await Payment.findOne({
    bookingId: req.body.bookingId,
    userId: req.user.id,
    status: "success"
  });

  if (existingPayment) {
    return res.status(409).json({
      success: false,
      message: "Booking is already marked as paid",
      data: existingPayment.toSanitizedJSON()
    });
  }

  const stripe = getStripeClient();
  const amount = Number(req.body.amount);
  const currency = env.stripeCurrency.toLowerCase();

  if (amount < env.stripeMinimumChargeAmount) {
    return res.status(400).json({
      success: false,
      message: `Minimum payable amount is $${env.stripeMinimumChargeAmount}. Increase the booking units before paying with Stripe.`
    });
  }

  const successUrl = `${env.frontendAppUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${env.frontendAppUrl}/bookings?payment=cancelled`;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: req.user.email,
    payment_method_types: ["card"],
    metadata: {
      bookingId: req.body.bookingId,
      userId: req.user.id
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency,
          product_data: {
            name: `ChargeOps Booking ${req.body.bookingId}`,
            description: "EV charging booking payment"
          },
          unit_amount: Math.round(amount * 100)
        }
      }
    ]
  });

  const payment = await Payment.create({
    bookingId: req.body.bookingId,
    userId: req.user.id,
    amount,
    paymentMethod: req.body.paymentMethod,
    provider: "stripe",
    currency,
    transactionId: session.id,
    stripeSessionId: session.id,
    status: "pending"
  });

  return res.status(201).json({
    success: true,
    message: "Stripe checkout session created successfully",
    data: {
      ...payment.toSanitizedJSON(),
      checkoutUrl: session.url,
      sessionId: session.id
    }
  });
};

export const createMockPayment = async (req, res) => {
  const existingPayment = await Payment.findOne({
    bookingId: req.body.bookingId,
    userId: req.user.id,
    status: "success"
  });

  if (existingPayment) {
    return res.status(409).json({
      success: false,
      message: "Booking is already marked as paid",
      data: existingPayment.toSanitizedJSON()
    });
  }

  const amount = Number(req.body.amount);
  const currency = env.stripeCurrency.toLowerCase();

  await updateBookingPaymentStatus(req.body.bookingId, "paid");

  const payment = await Payment.create({
    bookingId: req.body.bookingId,
    userId: req.user.id,
    amount,
    paymentMethod: "wallet",
    provider: "mock",
    currency,
    transactionId: `mock_${req.body.bookingId}_${Date.now()}`,
    status: "success"
  });

  return res.status(201).json({
    success: true,
    message: "Mock payment completed successfully",
    data: payment.toSanitizedJSON()
  });
};

export const verifyStripeSession = async (req, res) => {
  const stripe = getStripeClient();
  const sessionId = req.validated?.query?.session_id || req.query.session_id;
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent"]
  });

  const payment = await Payment.findOne({ stripeSessionId: session.id });

  if (!payment) {
    return res.status(404).json({
      success: false,
      message: "Payment session not found"
    });
  }

  if (req.user.role !== "admin" && payment.userId !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: "You are not allowed to verify this payment"
    });
  }

  if (session.payment_status !== "paid") {
    return res.status(400).json({
      success: false,
      message: "Stripe payment is not completed yet",
      data: payment.toSanitizedJSON()
    });
  }

  if (payment.status !== "success") {
    try {
      await updateBookingPaymentStatus(payment.bookingId, "paid");
      payment.status = "success";
      payment.stripePaymentIntentId =
        typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
      await payment.save();
    } catch (error) {
      payment.status = "failed";
      await payment.save();
      throw error;
    }
  }

  return res.status(200).json({
    success: true,
    message: "Stripe payment verified successfully",
    data: payment.toSanitizedJSON()
  });
};

export const getPaymentById = async (req, res) => {
  const payment = await Payment.findById(req.params.id);

  if (!payment) {
    return res.status(404).json({
      success: false,
      message: "Payment not found"
    });
  }

  if (req.user.role !== "admin" && payment.userId !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: "You are not allowed to access this payment"
    });
  }

  return res.status(200).json({
    success: true,
    data: payment.toSanitizedJSON()
  });
};

export const getUserPayments = async (req, res) => {
  const payments = await Payment.find({ userId: req.user.id }).sort({ createdAt: -1 });

  return res.status(200).json({
    success: true,
    data: payments.map((payment) => payment.toSanitizedJSON())
  });
};

export const getAllPayments = async (req, res) => {
  const payments = await Payment.find().sort({ createdAt: -1 });

  return res.status(200).json({
    success: true,
    data: payments.map((payment) => payment.toSanitizedJSON())
  });
};
