import { apiClient } from "../api/apiClient";

export const loyaltyProgramService = {
  getAll: ({ type = "Todas" } = {}, options) =>
    apiClient.get("/loyalty-programs", { params: { type }, ...options }).then(response => response.data),
  getById: (id, options) => apiClient.get(`/loyalty-programs/${id}`, options).then(response => response.data),
  create: program => apiClient.post("/loyalty-programs", program).then(response => response.data),
  update: (id, program) => apiClient.put(`/loyalty-programs/${id}`, program).then(response => response.data),
  remove: id => apiClient.delete(`/loyalty-programs/${id}`)
};
