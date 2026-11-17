import { apiClient } from "../api/apiClient";

export const teamService = {
  getAll: options => apiClient.get("/demo/team", options).then(response => response.data),
  create: member => apiClient.post("/demo/team", member).then(response => response.data),
  update: (id, member) => apiClient.put(`/demo/team/${id}`, member).then(response => response.data),
  remove: id => apiClient.delete(`/demo/team/${id}`).then(response => response.data)
};
