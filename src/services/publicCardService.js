import { apiClient } from "../api/apiClient";
import { toApiError } from "../api/apiErrors";
import { publicFileUrl } from "./publicMenuService";
import { walletService } from "./walletService";
import { buildWalletPass } from "../components/wallet/walletPass";

// Formulario público de cada tarjeta (el QR del detalle) y la tarjeta del cliente. Sin sesión del panel.
const PUBLIC = { skipAuth: true, skipRefresh: true };
const data = response => response.data;

/** Las imágenes del programa llegan como ruta del backend: se completan con su dominio. */
function withFiles(form) {
  if (!form?.tarjeta) return form;
  return { ...form, tarjeta: { ...form.tarjeta, imagen: publicFileUrl(form.tarjeta.imagen), portada: publicFileUrl(form.tarjeta.portada) } };
}

export const publicCardService = {
  getForm: (code, options) => apiClient.get(`/public/join/${encodeURIComponent(code)}`, { ...PUBLIC, ...options }).then(data).then(withFiles),
  /** body: { firstName, lastName, email, birthDate: "AAAA-MM-DD", marketingConsent } */
  join: (code, body, options) => apiClient.post(`/public/join/${encodeURIComponent(code)}`, body, { ...PUBLIC, ...options }).then(data),
  getCard: (qrToken, options) => apiClient.get(`/public/cards/${encodeURIComponent(qrToken)}`, { ...PUBLIC, ...options }).then(data),
  /**
   * Enlace "Guardar en Google Wallet" de la tarjeta recién creada. Primero lo firma el backend (así después
   * puede actualizar el pase y mandarle avisos); si el backend aún no tiene Google Wallet configurado (503),
   * lo firma la función de Vercel con la misma tarjeta y el mismo QR, para que la caja la reconozca igual.
   */
  async googleWalletLink({ qrToken, program, client, card }) {
    try {
      const response = await apiClient.post(`/public/cards/${encodeURIComponent(qrToken)}/google-wallet`, {}, PUBLIC);
      if (response.data?.saveUrl) return response.data.saveUrl;
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError.status !== 503) throw new Error(apiError.message);
    }
    const issued = { qrToken, estampillas: card?.estampillas ?? 0, saldoCashback: card?.saldo ?? 0, saldoGiftcard: card?.saldo ?? 0, puntos: card?.puntos ?? 0 };
    return walletService.createGoogleWalletLink(buildWalletPass(program, { client, detail: program.descripcion || "", issued }));
  }
};
