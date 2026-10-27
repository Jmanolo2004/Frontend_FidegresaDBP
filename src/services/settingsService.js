import { apiClient } from "../api/apiClient";

export const settingsService = {
  get: options => apiClient.get("/settings", options).then(response => response.data),
  update: changes => apiClient.patch("/settings", changes).then(response => response.data),
  reset: () => apiClient.post("/settings/reset").then(response => response.data),
  getNotices: options => apiClient.get("/notices", options).then(response => response.data)
};
