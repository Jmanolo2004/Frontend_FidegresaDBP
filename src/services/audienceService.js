import { apiClient } from "../api/apiClient";

export const audienceService = {
  getAll: (params = {}, options) => apiClient.get("/audiences", { ...options, params }).then(response => response.data),
  getById: (id, options) => apiClient.get(`/audiences/${id}`, options).then(response => response.data),
  preview: (filters, options) => apiClient.post("/audiences/preview", filters, options).then(response => response.data),
  create: audience => apiClient.post("/audiences", audience).then(response => response.data),
  update: (id, audience) => apiClient.put(`/audiences/${id}`, audience).then(response => response.data),
  setStatus: (id, estado) => apiClient.patch(`/audiences/${id}/status`, { estado }).then(response => response.data),
  remove: id => apiClient.delete(`/audiences/${id}`).then(response => response.data),
  duplicate: id => apiClient.post(`/audiences/${id}/duplicate`).then(response => response.data),
  sendTest: id => apiClient.post(`/audiences/${id}/test`).then(response => response.data)
};
