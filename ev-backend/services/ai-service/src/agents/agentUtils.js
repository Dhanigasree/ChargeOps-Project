const words = (value = "") => String(value).toLowerCase();

export const classifyIntent = (message = "") => {
  const lower = words(message);

  if (/(co2|carbon|green|sustain|environment|emission)/.test(lower)) {
    return "sustainability";
  }
  if (/(report|monthly report)/.test(lower)) {
    return "report";
  }
  if (/(utilization|maintenance|region|demand|revenue|admin|highest)/.test(lower)) {
    return "analytics";
  }
  if (/(spend|spent|payment|cost|bill|invoice|receipt|download|paid|trend)/.test(lower)) {
    return "payment";
  }
  if (/(review|rating|feedback|best rated|sentiment)/.test(lower)) {
    return "review";
  }
  if (/(book|booking|reserve|slot|peak|tomorrow|predict|forecast|recommend time)/.test(lower)) {
    return "booking";
  }
  if (/(station|charger|charging|near|available|fast|dc)/.test(lower)) {
    return "station";
  }

  return "assistant";
};

export const extractLocation = (message = "", preferences = {}) => {
  const match = message.match(/\b(?:near|in|at)\s+([a-zA-Z0-9\s-]{3,80})/i);
  return match?.[1]?.replace(/[?.!,].*$/, "").trim() || preferences.favoriteLocations?.[0] || "";
};

export const formatHour = (hour) => {
  if (hour === null || hour === undefined) {
    return "not enough history";
  }

  const normalized = Number(hour);
  if (!Number.isFinite(normalized)) {
    return "not enough history";
  }

  const suffix = normalized >= 12 ? "PM" : "AM";
  const display = normalized % 12 || 12;
  return `${display}:00 ${suffix}`;
};

export const explain = (...reasons) => `Why this recommendation was made: ${reasons.filter(Boolean).join("; ")}.`;

export const co2AvoidedKg = (energyKwh = 0) => Number((Number(energyKwh || 0) * 0.82).toFixed(2));

export const estimatedEnergyKwhFromPayments = (payments = []) =>
  Number(payments.reduce((sum, payment) => sum + Number(payment.units || payment.energyKwh || payment.kwh || 0), 0).toFixed(2));
