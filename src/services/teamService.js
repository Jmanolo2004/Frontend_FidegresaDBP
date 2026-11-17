import { apiClient } from "../api/apiClient";

export const teamService = {
  getAll: options => apiClient.get("/team", options).then(response => response.data),
  create: member => apiClient.post("/team", member).then(response => response.data),
  update: (id, member) => apiClient.put(`/team/${id}`, member).then(response => response.data),
  remove: id => apiClient.delete(`/team/${id}`).then(response => response.data)
};
