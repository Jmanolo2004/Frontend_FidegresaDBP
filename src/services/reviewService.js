import { apiClient } from "../api/apiClient";

export const reviewService = {
  getPage: ({ page = 0, size = 10, sentiment = "Todas", reply = "Todas" }, options) =>
    apiClient.get("/reviews", { params: { page, size, sentiment, reply }, ...options }).then(response => response.data),
  getSummary: options => apiClient.get("/reviews/summary", options).then(response => response.data),
  reply: (id, reply) => apiClient.patch(`/reviews/${id}/reply`, { reply }).then(response => response.data),
  /** Último resumen con IA del negocio o de un local (404 si todavía no hay uno). */
  getAiSummary: (branchId, options) =>
    apiClient.get("/reviews/ai-summary", { params: { branchId: branchId || undefined }, ...options }).then(response => response.data),
  /** Genera un resumen nuevo con IA (por defecto, el mes en curso). La IA puede tardar: se le da más tiempo que al resto. */
  generateAiSummary: ({ branchId, from, to } = {}) =>
    apiClient.post("/reviews/ai-summary", { branchId: branchId || null, from, to }, { timeout: 60000 }).then(response => response.data),
  /** Respuesta sugerida con IA para una reseña ({ reviewId, suggestion, model }). No guarda nada: se publica con reply(). */
  suggestReply: id => apiClient.post(`/reviews/${id}/reply-suggestion`, {}, { timeout: 60000 }).then(response => response.data)
};
