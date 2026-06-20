import { env } from "../config/env.js";

const buildUrl = (baseUrl, path, query = {}) => {
  const url = new URL(path, baseUrl);

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url;
};

export const requestJson = async ({ baseUrl, path, method = "GET", query, body, authorization }) => {
  const url = buildUrl(baseUrl, path, query);
  let lastError;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(authorization ? { Authorization: authorization } : {})
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(env.requestTimeoutMs)
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const error = new Error(payload.message || `ChargeOps service request failed with status ${response.status}`);
        error.statusCode = response.status;
        error.payload = payload;
        error.url = url.toString();
        throw error;
      }

      return payload;
    } catch (error) {
      lastError = error;

      if (error.statusCode && error.statusCode < 500) {
        throw error;
      }

      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 250));
      }
    }
  }

  throw lastError;
};
