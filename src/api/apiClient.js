import axios from "axios";
import { tokenStorage } from "./tokenStorage";
import { toApiError } from "./apiErrors";

const API_URL = import.meta.env.VITE_API_URL || "/api/v1";
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

const MAX_RETRIES = 2;

// El servidor de demostración se descarga solo cuando VITE_USE_MOCK=true; no entra en el build real.
async function demoAdapter(config) {
  const { mockAdapter } = await import("../mocks/mockAdapter");
  return mockAdapter(config);
}

const sessionListeners = new Set();

export function onSessionExpired(listener) {
  sessionListeners.add(listener);
  return () => sessionListeners.delete(listener);
}

function notifySessionExpired() {
  sessionListeners.forEach(listener => listener());
}

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  ...(USE_MOCK ? { adapter: demoAdapter } : {})
});

// Agrega el JWT a cada petición autenticada.
apiClient.interceptors.request.use(config => {
  const token = tokenStorage.getAccessToken();
  if (token && !config.skipAuth) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshPromise = null;

async function refreshSession() {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) throw new Error("Sin refresh token");
  refreshPromise ??= apiClient
    .post("/auth/refresh", { refreshToken }, { skipAuth: true, skipRefresh: true })
    .then(response => {
      tokenStorage.set({ ...tokenStorage.get(), ...response.data });
      return response.data.token;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

// Manejo global: refresh del token ante un 401, reintentos y errores normalizados.
apiClient.interceptors.response.use(
  response => response,
  async error => {
    const config = error.config || {};
    const status = error.response?.status;

    if (status === 401 && !config.skipRefresh && !config._retriedAuth && tokenStorage.getRefreshToken()) {
      config._retriedAuth = true;
      try {
        const token = await refreshSession();
        config.headers.Authorization = `Bearer ${token}`;
        return apiClient(config);
      } catch {
        tokenStorage.clear();
        notifySessionExpired();
        return Promise.reject(toApiError(error));
      }
    }

    if (status === 401 && !config.skipRefresh) {
      tokenStorage.clear();
      notifySessionExpired();
    }

    const apiError = toApiError(error);
    const isIdempotent = ["get", "head", "options"].includes((config.method || "get").toLowerCase());
    config._retryCount = config._retryCount || 0;
    if (apiError.isRetryable && isIdempotent && config._retryCount < MAX_RETRIES && !config.signal?.aborted) {
      config._retryCount += 1;
      await wait(400 * 2 ** (config._retryCount - 1));
      return apiClient(config);
    }

    return Promise.reject(apiError);
  }
);
