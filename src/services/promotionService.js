import { apiClient } from "../api/apiClient";

/** Promociones con descuento para un grupo de clientes. Al empezar, el backend avisa en la tarjeta de Google Wallet. */
export const promotionService = {
  getPage: ({ page = 0, size = 5 } = {}, options) =>
    apiClient.get("/promotions", { params: { page, size }, ...options }).then(response => response.data),
  previewAudience: ({ segment, programId }, options) =>
    apiClient.post("/promotions/audience", { segment, programId: programId || null }, options).then(response => response.data),
  create: (promotion, options) => apiClient.post("/promotions", promotion, options).then(response => response.data),
  setActive: (id, active, options) => apiClient.patch(`/promotions/${id}/status`, { active }, options).then(response => response.data)
};
