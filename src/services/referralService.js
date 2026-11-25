import { apiClient } from "../api/apiClient";

const publicRequest = { skipAuth: true, skipRefresh: true };
const STORAGE_KEY = "fidegresa.referralCode";

/** Código de invitación: letras y números, como lo genera el backend. */
export function cleanReferralCode(value) {
  const code = String(value ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return code.length >= 4 && code.length <= 20 ? code : "";
}

export const referralService = {
  /** GET /public/business-referrals/{code} → { code, businessName } del negocio que invita. */
  getBusinessInvite: (code, options = {}) =>
    apiClient.get(`/public/business-referrals/${encodeURIComponent(code)}`, { ...publicRequest, ...options }).then(response => response.data),

  /** Guarda el código mientras dure la visita, por si pasa por la landing antes de registrarse. */
  remember(code) {
    try {
      if (code) sessionStorage.setItem(STORAGE_KEY, code);
    } catch {
      // Sin almacenamiento (modo privado): el código sigue en la dirección.
    }
  },

  remembered() {
    try {
      return cleanReferralCode(sessionStorage.getItem(STORAGE_KEY));
    } catch {
      return "";
    }
  },

  forget() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nada que limpiar.
    }
  }
};
