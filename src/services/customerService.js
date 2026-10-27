import { apiClient } from "../api/apiClient";

export const customerService = {
  getPage: ({ page = 0, size = 10, search = "", status = "Todos", sort = "recent" }, options) =>
    apiClient.get("/customers", { params: { page, size, search, status, sort }, ...options }).then(response => response.data),
  getStats: options => apiClient.get("/customers/stats", options).then(response => response.data),
  getById: (id, options) => apiClient.get(`/customers/${id}`, options).then(response => response.data),
  create: payload => apiClient.post("/customers", payload).then(response => response.data),
  getAllForExport: ({ search, status }) =>
    apiClient
      .get("/customers", { params: { page: 0, size: 100, search, status } })
      .then(response => response.data.content)
};
