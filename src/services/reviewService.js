import { apiClient } from "../api/apiClient";

export const reviewService = {
  getPage: ({ page = 0, size = 10, sentiment = "Todas", reply = "Todas" }, options) =>
    apiClient.get("/reviews", { params: { page, size, sentiment, reply }, ...options }).then(response => response.data),
  getSummary: options => apiClient.get("/reviews/summary", options).then(response => response.data),
  reply: (id, reply) => apiClient.patch(`/reviews/${id}/reply`, { reply }).then(response => response.data)
};
