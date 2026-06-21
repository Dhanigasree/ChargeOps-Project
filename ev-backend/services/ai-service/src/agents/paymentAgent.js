import { runTool } from "../tools/index.js";
import { estimatedEnergyKwhFromPayments } from "./agentUtils.js";

export const paymentAgent = {
  name: "Payment Agent",
  intents: ["payment"],
  async run({ message, context }) {
    if (/(all invoices|show invoices|list invoices|monthly payment report|payment report)/i.test(message || "")) {
      const period = /(month|monthly)/i.test(message || "") ? "this_month" : "all_time";
      const invoiceResult = await runTool("get_payment_invoices", { period }, context);
      const invoices = invoiceResult.invoices || [];

      return {
        agent: this.name,
        intent: "payment",
        answer: invoices.length
          ? `I found ${invoices.length} invoice(s) totaling ${Number(invoiceResult.total || 0).toFixed(2)} ${String(invoiceResult.currency || "usd").toUpperCase()}. Latest invoice: ${invoices[0].invoiceNumber}.`
          : "No completed payment invoices were found for this period.",
        data: {
          invoices,
          total: invoiceResult.total || 0,
          currency: invoiceResult.currency || "usd",
          period
        },
        explainability: "Why this recommendation was made: retrieved successful payment invoices from ChargeOps payment history and summarized the requested period."
      };
    }

    if (/(invoice|bill|receipt|download)/i.test(message || "")) {
      const latestInvoice = await runTool("get_latest_invoice", {}, context);

      return {
        agent: this.name,
        intent: "payment",
        answer: latestInvoice.invoice?.invoiceUrl
          ? `Your latest invoice is ${latestInvoice.invoice.invoiceNumber}. Secure download link: ${latestInvoice.invoice.invoiceUrl}`
          : latestInvoice.message,
        data: {
          invoice: latestInvoice.invoice || null
        },
        explainability: "Why this recommendation was made: selected the latest successful payment invoice from your ChargeOps payment history."
      };
    }

    const spending = await runTool("get_spending_history", { period: "this_month" }, context);
    const energyKwh = estimatedEnergyKwhFromPayments(spending.payments || []);

    return {
      agent: this.name,
      intent: "payment",
      answer: `This month you spent ${Number(spending.total || 0).toFixed(2)} ${String(spending.currency || "usd").toUpperCase()} across ${spending.payments?.length || 0} successful payment(s).`,
      data: {
        monthlySpend: spending.total || 0,
        totalAllTime: spending.totalAllTime || 0,
        currency: spending.currency || "usd",
        payments: spending.payments || [],
        estimatedEnergyKwh: energyKwh
      },
      explainability: "Why this recommendation was made: calculated from successful payment records for the requested period."
    };
  }
};
