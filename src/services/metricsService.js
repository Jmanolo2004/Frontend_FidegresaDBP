import { apiClient } from "../api/apiClient";

export const metricsService = {
  getDashboard: ({ period, metric }, options) =>
    apiClient.get("/metrics", { params: { period, metric }, ...options }).then(response => response.data)
};
