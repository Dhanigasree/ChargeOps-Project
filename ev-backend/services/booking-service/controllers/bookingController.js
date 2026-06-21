import Booking from "../models/Booking.js";
import { publishChargeOpsEvent } from "../services/eventPublisher.js";

export const createBooking = async (req, res) => {
  const slotTime = new Date(req.body.slotTime);

  if (slotTime <= new Date()) {
    return res.status(400).json({
      success: false,
      message: "Slot time must be in the future"
    });
  }

  const existingBooking = await Booking.findOne({
    stationId: req.body.stationId,
    slotTime,
    status: "booked"
  });

  if (existingBooking) {
    return res.status(409).json({
      success: false,
      message: "Selected slot is already booked"
    });
  }

  const booking = await Booking.create({
    userId: req.user.id,
    stationId: req.body.stationId,
    slotTime,
    amount: req.body.amount
  });

  await publishChargeOpsEvent({
    type: "BOOKING_CREATED",
    aggregateId: String(booking._id),
    userId: booking.userId,
    data: booking.toSanitizedJSON()
  });

  return res.status(201).json({
    success: true,
    message: "Booking created successfully",
    data: booking.toSanitizedJSON()
  });
};

export const cancelBooking = async (req, res) => {
  const booking = await Booking.findById(req.params.bookingId);

  if (!booking) {
    return res.status(404).json({
      success: false,
      message: "Booking not found"
    });
  }

  const canCancel = req.user.role === "admin" || booking.userId === req.user.id;

  if (!canCancel) {
    return res.status(403).json({
      success: false,
      message: "You are not allowed to cancel this booking"
    });
  }

  if (booking.status !== "booked") {
    return res.status(400).json({
      success: false,
      message: "Only booked reservations can be cancelled"
    });
  }

  booking.status = "cancelled";
  await booking.save();

  return res.status(200).json({
    success: true,
    message: "Booking cancelled successfully",
    data: booking.toSanitizedJSON()
  });
};

export const getUserBookings = async (req, res) => {
  const bookings = await Booking.find({ userId: req.user.id }).sort({ createdAt: -1 });

  return res.status(200).json({
    success: true,
    data: bookings.map((booking) => booking.toSanitizedJSON())
  });
};

export const getStationBookings = async (req, res) => {
  const bookings = await Booking.find({ stationId: req.params.stationId }).sort({ slotTime: 1 });

  return res.status(200).json({
    success: true,
    data: bookings.map((booking) => booking.toSanitizedJSON())
  });
};

export const getAllBookings = async (req, res) => {
  const bookings = await Booking.find().sort({ createdAt: -1 });

  return res.status(200).json({
    success: true,
    data: bookings.map((booking) => booking.toSanitizedJSON())
  });
};

export const updateBookingPaymentStatus = async (req, res) => {
  const booking = await Booking.findById(req.params.bookingId);

  if (!booking) {
    return res.status(404).json({
      success: false,
      message: "Booking not found"
    });
  }

  booking.paymentStatus = req.body.paymentStatus;
  await booking.save();

  return res.status(200).json({
    success: true,
    message: "Booking payment status updated successfully",
    data: booking.toSanitizedJSON()
  });
};
