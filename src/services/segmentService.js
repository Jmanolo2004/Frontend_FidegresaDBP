import { apiClient } from "../api/apiClient";

/** Grupos de clientes que arma el backend (fieles, en riesgo, nuevos, cumpleaños). */
export const segmentService = {
  getAll: options => apiClient.get("/segments", options).then(response => response.data),
  getCustomers: (key, { page = 0, size = 5 } = {}, options) =>
    apiClient.get(`/segments/${key}/customers`, { params: { page, size }, ...options }).then(response => response.data),
  getSettings: options => apiClient.get("/segments/settings", options).then(response => response.data)
};
