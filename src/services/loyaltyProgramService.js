import { apiClient } from "../api/apiClient";

export const loyaltyProgramService = {
  getAll: ({ type = "", status = "", search = "" } = {}, options) =>
    apiClient.get("/loyalty-programs", { params: { type, status, search }, ...options }).then(response => response.data),
  getById: (id, options) => apiClient.get(`/loyalty-programs/${id}`, options).then(response => response.data),
  getCustomers: (id, params, options) => apiClient.get(`/loyalty-programs/${id}/customers`, { params, ...options }).then(response => response.data),
  create: (program, options) => apiClient.post("/loyalty-programs", program, options).then(response => response.data),
  update: (id, program, options) => apiClient.put(`/loyalty-programs/${id}`, program, options).then(response => response.data),
  setStatus: (id, estado, options) => apiClient.patch(`/loyalty-programs/${id}/status`, { estado }, options).then(response => response.data),
  duplicate: (id, options) => apiClient.post(`/loyalty-programs/${id}/duplicate`, {}, options).then(response => response.data),
  remove: (id, options) => apiClient.delete(`/loyalty-programs/${id}`, options)
};
