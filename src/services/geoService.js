import { apiClient } from "../api/apiClient";

export const geoService = {
  getCustomers: (params = {}, options) => apiClient.get("/geo/customers", { ...options, params }).then(response => response.data),
  getHeatmap: (params = {}, options) => apiClient.get("/geo/heatmap", { ...options, params }).then(response => response.data),
  getSettings: options => apiClient.get("/geo/settings", options).then(response => response.data),
  updateSettings: changes => apiClient.patch("/geo/settings", changes).then(response => response.data),
  updatePosition: (id, position) => apiClient.patch(`/branches/${id}/position`, position).then(response => response.data)
};
