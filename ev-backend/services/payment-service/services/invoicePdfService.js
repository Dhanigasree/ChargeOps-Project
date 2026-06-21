import PDFDocument from "pdfkit";
import QRCode from "qrcode";

const formatCurrency = (amount, currency) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: String(currency || "INR").toUpperCase() === "USD" ? "USD" : "INR",
    minimumFractionDigits: 2
  }).format(Number(amount || 0));

const formatDate = (value) =>
  new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(value ? new Date(value) : new Date());

const writeRow = (doc, label, value, y) => {
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#475569").text(label, 50, y);
  doc.font("Helvetica").fontSize(10).fillColor("#0f172a").text(value || "-", 230, y);
};

export const generateInvoicePdf = async ({ payment, user, booking, station, invoiceUrl }) => {
  const gstRate = 0.18;
  const subtotal = Number(payment.amount || 0);
  const gst = Number((subtotal * gstRate).toFixed(2));
  const total = Number((subtotal + gst).toFixed(2));
  const energyKwh = Number(booking?.energyKwh || booking?.units || Math.max(1, Math.round(subtotal / Number(station?.pricePerUnit || subtotal || 1))));
  const qrPayload = JSON.stringify({
    invoiceNumber: payment.invoiceNumber,
    paymentId: String(payment._id),
    bookingId: payment.bookingId,
    total,
    status: payment.status
  });
  const qrDataUrl = await QRCode.toDataURL(qrPayload, { margin: 1, width: 140 });
  const qrBuffer = Buffer.from(qrDataUrl.split(",")[1], "base64");

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.rect(0, 0, 595, 115).fill("#0f172a");
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(26).text("ChargeOps", 50, 36);
    doc.font("Helvetica").fontSize(11).fillColor("#cbd5e1").text("EV Charging Management Platform", 50, 68);
    doc.roundedRect(430, 32, 110, 44, 8).fill("#f59e0b");
    doc.fillColor("#111827").font("Helvetica-Bold").fontSize(13).text("PAID", 466, 47);

    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(20).text("Payment Invoice", 50, 145);
    doc.font("Helvetica").fontSize(10).fillColor("#64748b").text(`Invoice Number: ${payment.invoiceNumber}`, 50, 174);
    doc.text(`Payment Date: ${formatDate(payment.invoiceCreatedAt || payment.updatedAt || payment.createdAt)}`, 50, 190);

    doc.image(qrBuffer, 455, 142, { width: 90 });
    doc.fontSize(8).fillColor("#64748b").text("Scan to verify", 459, 236, { width: 90, align: "center" });

    doc.roundedRect(50, 265, 495, 185, 8).strokeColor("#e2e8f0").stroke();
    writeRow(doc, "User Name", user?.name || user?.email || "ChargeOps User", 290);
    writeRow(doc, "User Email", user?.email || payment.userEmail || "-", 315);
    writeRow(doc, "Booking ID", payment.bookingId, 340);
    writeRow(doc, "Charging Station", station?.name || booking?.stationName || booking?.stationId || "ChargeOps Station", 365);
    writeRow(doc, "Charging Duration", booking?.duration || booking?.chargingDuration || "1 charging slot", 390);
    writeRow(doc, "Energy Consumed", `${energyKwh} kWh`, 415);

    doc.roundedRect(50, 475, 495, 105, 8).fillAndStroke("#f8fafc", "#e2e8f0");
    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(11).text("Amount", 70, 498);
    doc.font("Helvetica").text(formatCurrency(subtotal, payment.currency), 440, 498, { width: 80, align: "right" });
    doc.font("Helvetica-Bold").text("GST (18%)", 70, 525);
    doc.font("Helvetica").text(formatCurrency(gst, payment.currency), 440, 525, { width: 80, align: "right" });
    doc.moveTo(70, 548).lineTo(520, 548).strokeColor("#cbd5e1").stroke();
    doc.font("Helvetica-Bold").fontSize(13).fillColor("#0f172a").text("Total Amount", 70, 560);
    doc.text(formatCurrency(total, payment.currency), 420, 560, { width: 100, align: "right" });

    doc.font("Helvetica").fontSize(10).fillColor("#334155").text(`Payment Status: ${payment.status}`, 50, 610);
    doc.text(`Secure invoice link: ${invoiceUrl || "Available through ChargeOps authenticated download"}`, 50, 628, {
      width: 495
    });

    doc.rect(0, 760, 595, 82).fill("#0f172a");
    doc.fillColor("#cbd5e1").fontSize(9).text("Thank you for charging with ChargeOps.", 50, 782);
    doc.text("This is a system-generated invoice. For support, contact ChargeOps billing operations.", 50, 798);

    doc.end();
  });
};
