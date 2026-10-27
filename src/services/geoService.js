import { apiClient } from "../api/apiClient";

export const geoService = {
  getCustomers: options => apiClient.get("/geo/customers", options).then(response => response.data),
  getSettings: options => apiClient.get("/geo/settings", options).then(response => response.data),
  updateSettings: changes => apiClient.patch("/geo/settings", changes).then(response => response.data),
  createAudience: audience => apiClient.post("/geo/audiences", audience).then(response => response.data)
};
