import { apiClient } from "../api/apiClient";

/** Programa de referidos: un cliente invita a una amiga y ambos reciben un premio en su primera visita o compra. */
export const referralService = {
  getStats: ({ from, to } = {}, options) => apiClient.get("/referrals/stats", { params: { from, to }, ...options }).then(response => response.data),
  getPage: ({ status, page = 0, size = 10 } = {}, options) =>
    apiClient.get("/referrals", { params: { status: status || undefined, page, size }, ...options }).then(response => response.data),
  /** Ranking de embajadoras con todas las invitaciones (el backend las cuenta); limit de 1 a 50. */
  getRanking: ({ from, to, limit = 5 } = {}, options) =>
    apiClient.get("/referrals/ranking", { params: { from, to, limit }, ...options }).then(response => response.data),
  getSettings: options => apiClient.get("/referrals/settings", options).then(response => response.data),
  saveSettings: (programId, body, options) => apiClient.put(`/referrals/settings/${programId}`, body, options).then(response => response.data)
};
