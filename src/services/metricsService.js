import { apiClient } from "../api/apiClient";

export const metricsService = {
  getDashboard: ({ period, metric }, options) =>
    apiClient.get("/metrics", { params: { period, metric }, ...options }).then(response => response.data),
  getOverview: (filters, options) => apiClient.get("/metrics/overview", { params: filters, ...options }).then(response => response.data),
  getActivity: (params, options) => apiClient.get("/metrics/activity", { params, ...options }).then(response => response.data),
  getCohorts: (params, options) => apiClient.get("/metrics/cohorts", { params, ...options }).then(response => response.data),
  getInsights: (params, options) => apiClient.get("/metrics/insights", { params, ...options }).then(response => response.data),
  exportCsv: (params, options) => apiClient.get("/metrics/export", { params: { ...params, format: "csv" }, ...options }).then(response => response.data)
};
