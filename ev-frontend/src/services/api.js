import axios from "axios";

const getStoredToken = () => localStorage.getItem("chargeops_token") || sessionStorage.getItem("chargeops_token");

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  headers: {
    "Content-Type": "application/json"
  }
});

api.interceptors.request.use((config) => {
  const token = getStoredToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const authApi = {
  register: (payload) => api.post("/auth/register", payload),
  login: (payload) => api.post("/auth/login", payload),
  me: () => api.get("/auth/me")
};

export const userApi = {
  me: () => api.get("/users/me"),
  updateMe: (payload) => api.put("/users/me", payload),
  list: () => api.get("/users")
};

export const stationApi = {
  list: (params) => api.get("/stations", { params }),
  getById: (stationId) => api.get(`/stations/${stationId}`),
  create: (payload) => api.post("/stations", payload),
  update: (stationId, payload) => api.put(`/stations/${stationId}`, payload),
  remove: (stationId) => api.delete(`/stations/${stationId}`)
};

export const bookingApi = {
  create: (payload) => api.post("/bookings", payload),
  mine: () => api.get("/bookings/me"),
  cancel: (bookingId) => api.patch(`/bookings/${bookingId}/cancel`)
};

export const paymentApi = {
  create: (payload) => api.post("/payments/create", payload),
  mockPay: (payload) => api.post("/payments/mock-pay", payload),
  verifyStripeSession: (sessionId) => api.get("/payments/checkout/verify", { params: { session_id: sessionId } }),
  getById: (paymentId) => api.get(`/payments/${paymentId}`)
};

export const reviewApi = {
  create: (payload) => api.post("/reviews", payload),
  listByStation: (stationId) => api.get(`/reviews/${stationId}`),
  remove: (reviewId) => api.delete(`/reviews/${reviewId}`)
};

export const adminApi = {
  users: () => api.get("/admin/users"),
  bookings: () => api.get("/admin/bookings"),
  analytics: () => api.get("/admin/analytics"),
  approveStation: (stationId, isApproved = true) => api.put(`/admin/stations/${stationId}/approve`, { isApproved })
};

export const aiApi = {
  health: () => api.get("/ai/health"),
  chat: (payload) => api.post("/ai/chat", payload),
  recommend: (payload) => api.post("/ai/recommend", payload),
  stations: (payload) => api.post("/ai/stations", payload),
  predict: (payload) => api.post("/ai/predict", payload)
};

export default api;
