import { apiClient } from "../api/apiClient";

// Páginas públicas (sin sesión): el menú que ve la clienta al escanear el QR y el enlace de una amiga.
// skipAuth y skipRefresh: nunca mandan el token del panel ni intentan renovar la sesión.
const PUBLIC = { skipAuth: true, skipRefresh: true };
const data = response => response.data;

const API_URL = import.meta.env.VITE_API_URL || "https://fidegresa-api.onrender.com/api/v1";
const API_ORIGIN = API_URL.replace(/\/api\/v1\/?$/, "");
const VISITOR_KEY = "fidegresa.visitor";

/** Identificador anónimo del navegador, para que el backend cuente visitas únicas al menú. */
export function visitorId() {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return undefined;
  }
}

/** Los archivos públicos (carta en PDF o imágenes) llegan como "/api/v1/public/menu-files/7": se completan con el dominio del backend. */
export function publicFileUrl(path) {
  if (!path) return null;
  return /^https?:\/\//.test(path) ? path : `${API_ORIGIN}${path}`;
}

export const publicMenuService = {
  getMenu: (slug, options) => apiClient.get(`/public/menus/${encodeURIComponent(slug)}`, { ...PUBLIC, params: { visitorId: visitorId() }, ...options }).then(data),
  join: (slug, body) => apiClient.post(`/public/menus/${encodeURIComponent(slug)}/join`, body, PUBLIC).then(data),
  getReferral: (code, options) => apiClient.get(`/public/referrals/${encodeURIComponent(code)}`, { ...PUBLIC, params: { visitorId: visitorId() }, ...options }).then(data)
};
