import { create } from "axios";
import { toApiError } from "./apiErrors";
import { getAccessToken } from "./tokenStorage";

// Backend publicado en Render por defecto. Para usar un backend local, define EXPO_PUBLIC_API_URL en .env
// con la IP de tu PC en la red Wi-Fi (por ejemplo http://192.168.1.42:8080/api/v1), nunca localhost.
const DEFAULT_API_URL = "https://fidegresa-api.onrender.com/api/v1";

export const API_URL = (process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL).replace(/\/+$/, "");

const MAX_RETRIES = 2;
const RETRYABLE_METHODS = ["get", "head", "options"];

/** Cliente único hacia el backend de Fidegresa. */
export const apiClient = create({
  baseURL: API_URL,
  timeout: 12000,
  headers: { Accept: "application/json", "Content-Type": "application/json" }
});

/** El AuthContext registra aquí qué hacer cuando el backend responde 401. */
let unauthorizedHandler = null;
export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

/** Identificador único para que el backend pueda ignorar un movimiento enviado dos veces. */
function createIdempotencyKey() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// Request: agrega el JWT y una llave de idempotencia a las operaciones que cambian datos.
apiClient.interceptors.request.use(config => {
  const token = getAccessToken();
  if (token && !config.skipAuth) config.headers.Authorization = `Bearer ${token}`;
  const method = (config.method || "get").toLowerCase();
  if (!RETRYABLE_METHODS.includes(method) && !config.headers["Idempotency-Key"]) {
    config.headers["Idempotency-Key"] = createIdempotencyKey();
  }
  return config;
});

// Response: reintenta lecturas ante fallas de red o 5xx, cierra sesión en 401 y normaliza el error.
apiClient.interceptors.response.use(
  response => response,
  async error => {
    const apiError = toApiError(error);
    const config = error?.config;

    if (apiError.status === 401 && config && !config.skipAuth) {
      unauthorizedHandler?.();
      return Promise.reject(apiError);
    }

    const method = (config?.method || "get").toLowerCase();
    const attempt = config?.retryCount ?? 0;
    if (config && apiError.isRetryable && RETRYABLE_METHODS.includes(method) && attempt < MAX_RETRIES) {
      config.retryCount = attempt + 1;
      await wait(400 * 2 ** attempt);
      return apiClient(config);
    }

    return Promise.reject(apiError);
  }
);

/** Las listas del backend pueden venir como arreglo o como página de Spring ({ content, ... }). */
export function toPage(data) {
  if (Array.isArray(data)) {
    return { items: data, page: 0, totalPages: 1, totalElements: data.length, last: true };
  }
  const items = data?.content ?? [];
  const page = data?.number ?? 0;
  const totalPages = data?.totalPages ?? 1;
  return { items, page, totalPages, totalElements: data?.totalElements ?? items.length, last: data?.last ?? page >= totalPages - 1 };
}
