import { apiClient } from "../api/apiClient";

// Libro de Reclamaciones: público, sin la sesión del panel.
export const complaintService = {
  /** Devuelve { code, type, typeLabel, createdAt, responseDueBy, email }. */
  submit: (body, options) => apiClient.post("/public/complaints", body, { skipAuth: true, skipRefresh: true, ...options }).then(response => response.data)
};
