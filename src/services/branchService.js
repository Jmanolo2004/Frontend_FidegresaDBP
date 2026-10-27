import { apiClient } from "../api/apiClient";

export const branchService = {
  getAll: options => apiClient.get("/branches", options).then(response => response.data),
  create: branch => apiClient.post("/branches", branch).then(response => response.data),
  update: (id, branch) => apiClient.put(`/branches/${id}`, branch).then(response => response.data),
  setActive: (id, activa) => apiClient.patch(`/branches/${id}/status`, { activa }).then(response => response.data),
  updatePosition: (id, position) => apiClient.patch(`/branches/${id}/position`, position).then(response => response.data)
};
