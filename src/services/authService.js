import { apiClient } from "../api/apiClient";

const publicRequest = { skipAuth: true, skipRefresh: true };

export const authService = {
  login: credentials => apiClient.post("/auth/login", credentials, publicRequest).then(response => response.data),
  register: payload => apiClient.post("/auth/register", payload, publicRequest).then(response => response.data),
  loginWithProvider: provider => apiClient.post(`/auth/oauth/${provider}`, {}, publicRequest).then(response => response.data),
  getCurrentUser: options => apiClient.get("/auth/me", options).then(response => response.data),
  logout: () => apiClient.post("/auth/logout", {}, { skipRefresh: true })
};
