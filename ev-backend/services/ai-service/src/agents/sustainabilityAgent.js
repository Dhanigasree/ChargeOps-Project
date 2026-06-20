import { co2AvoidedKg, estimatedEnergyKwhFromPayments } from "./agentUtils.js";
import { runTool } from "../tools/index.js";

export const sustainabilityAgent = {
  name: "Sustainability Agent",
  intents: ["sustainability"],
  async run({ context }) {
    const spending = await runTool("get_spending_history", { period: "this_month" }, context).catch(() => ({ payments: [] }));
    const energyKwh = estimatedEnergyKwhFromPayments(spending.payments || []);
    const fallbackEnergyKwh = energyKwh || Number(((spending.total || 0) / 15).toFixed(2));
    const co2SavedKg = co2AvoidedKg(fallbackEnergyKwh);

    return {
      agent: this.name,
      intent: "sustainability",
      answer: `Estimated CO2 avoided this month: ${co2SavedKg} kg from approximately ${fallbackEnergyKwh} kWh of EV charging.`,
      data: {
        energyKwh: fallbackEnergyKwh,
        co2SavedKg,
        greenEnergySharePct: 38
      },
      explainability: "Why this recommendation was made: estimated EV energy use from payment and charging records, then applied an emissions-avoidance factor."
    };
  }
};
