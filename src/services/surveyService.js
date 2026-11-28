import { apiClient } from "../api/apiClient";

const data = response => response.data;
// La clienta responde sin sesión: nunca se manda el token del panel ni se intenta renovar la sesión.
const PUBLIC = { skipAuth: true, skipRefresh: true };

/** Encuesta de satisfacción después de la visita: configuración y resultados (panel) y respuesta (página pública). */
export const surveyService = {
  getSettings: options => apiClient.get("/surveys/settings", options).then(data),
  saveSettings: settings => apiClient.put("/surveys/settings", settings).then(data),
  getMetrics: ({ from, to, branchId } = {}, options) =>
    apiClient.get("/metrics/surveys", { params: { from, to, branchId: branchId || undefined }, ...options }).then(data),

  getPublic: (token, options) => apiClient.get(`/public/surveys/${encodeURIComponent(token)}`, { ...PUBLIC, ...options }).then(data),
  answer: (token, body) => apiClient.post(`/public/surveys/${encodeURIComponent(token)}`, body, PUBLIC).then(data)
};
