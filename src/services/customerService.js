import { apiClient } from "../api/apiClient";

export const customerService = {
  getPage: ({ page = 0, size = 10, search = "", status = "Todos", sort = "recent" }, options) =>
    apiClient.get("/customers", { params: { page, size, search, status, sort }, ...options }).then(response => response.data),
  getStats: options => apiClient.get("/customers/stats", options).then(response => response.data),
  getById: (id, options) => apiClient.get(`/customers/${id}`, options).then(response => response.data),
  create: payload => apiClient.post("/customers", payload).then(response => response.data),
  getAllForExport: async ({ search, status, sort }) => {
    const customers = [];
    let page = 0;
    let totalPages;
    do {
      const { data } = await apiClient.get("/customers", { params: { page, size: 100, search, status, sort } });
      if (!Array.isArray(data.content) || !Number.isInteger(data.totalPages) || data.totalPages < 0) {
        throw new Error("No se pudo obtener la lista completa de clientes.");
      }
      customers.push(...data.content);
      totalPages = data.totalPages;
      page += 1;
    } while (page < totalPages);
    return customers;
  }
};
