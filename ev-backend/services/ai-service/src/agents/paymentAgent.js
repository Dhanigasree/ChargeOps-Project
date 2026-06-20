import { runTool } from "../tools/index.js";
import { estimatedEnergyKwhFromPayments } from "./agentUtils.js";

export const paymentAgent = {
  name: "Payment Agent",
  intents: ["payment"],
  async run({ context }) {
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
