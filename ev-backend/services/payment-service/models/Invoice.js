import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
  {
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      required: true,
      unique: true,
      index: true
    },
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    invoiceS3Key: {
      type: String,
      required: true
    },
    invoiceUrl: {
      type: String,
      default: ""
    },
    userId: {
      type: String,
      required: true,
      index: true
    },
    bookingId: {
      type: String,
      required: true,
      index: true
    },
    stationName: {
      type: String,
      default: "ChargeOps Station"
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: "usd"
    },
    status: {
      type: String,
      default: "generated"
    }
  },
  {
    timestamps: true
  }
);

invoiceSchema.methods.toSanitizedJSON = function toSanitizedJSON() {
  return {
    id: this._id,
    paymentId: this.paymentId,
    invoiceNumber: this.invoiceNumber,
    invoiceS3Key: this.invoiceS3Key,
    invoiceUrl: this.invoiceUrl,
    userId: this.userId,
    bookingId: this.bookingId,
    stationName: this.stationName,
    amount: this.amount,
    currency: this.currency,
    status: this.status,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

const Invoice = mongoose.model("Invoice", invoiceSchema);

export default Invoice;
