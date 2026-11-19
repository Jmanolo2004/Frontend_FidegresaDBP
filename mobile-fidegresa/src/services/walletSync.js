import { getAccessToken } from "./tokenStorage";

// Panel web publicado en Vercel (donde vive api/google-wallet-update.js).
// Se puede cambiar con EXPO_PUBLIC_WALLET_URL en .env.
const DEFAULT_WALLET_URL = "https://frontendfidegresa.vercel.app";
const WALLET_URL = (process.env.EXPO_PUBLIC_WALLET_URL || DEFAULT_WALLET_URL).replace(/\/+$/, "");

/**
 * Pide actualizar el pase de Google Wallet de la tarjeta con sus valores reales (sellos, saldo o puntos).
 * No bloquea al cajero: la operación en caja ya quedó registrada. Devuelve { updated, message } para avisar en pantalla.
 */
export async function syncWalletPass(qrToken) {
  const token = getAccessToken();
  if (!WALLET_URL || !token || !qrToken) return { updated: false, message: null };
  try {
    const response = await fetch(`${WALLET_URL}/api/google-wallet-update`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ qrToken })
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok && data.updated) return { updated: true, message: "Google Wallet actualizado." };
    if (response.ok) return { updated: false, message: null }; // la tarjeta no tiene pase guardado en Wallet
    return { updated: false, message: `No se actualizó Google Wallet: ${data.message || `error ${response.status}`}` };
  } catch {
    return { updated: false, message: "No se pudo conectar con el panel para actualizar Google Wallet." };
  }
}
