import * as SecureStore from "expo-secure-store";

const LINKS_KEY = "fidegresa.walletLinks";

/** Prefijo del código de Google Wallet → tipo de tarjeta del backend. */
const PREFIX_TYPES = {
  EST: { key: "Estampillas", programType: "STAMPS", label: "Estampillas" },
  CAS: { key: "Cashback", programType: "CASHBACK", label: "Cashback" },
  CSH: { key: "Cashback", programType: "CASHBACK", label: "Cashback" },
  NIV: { key: "Niveles", programType: "LEVELS", label: "Niveles" },
  GIF: { key: "Giftcard", programType: "GIFT_CARD", label: "Gift card" },
  GFT: { key: "Giftcard", programType: "GIFT_CARD", label: "Gift card" }
};

/** Reconoce el tipo de tarjeta por su código: FDG-EST-…, FDG-CAS-…, FDG-NIV-…, FDG-GIF-… */
export function cardTypeFromToken(token) {
  const match = /^(?:FDG-)?([A-Z]{3})-[A-Z0-9]{4,12}$/.exec(String(token ?? "").trim().toUpperCase());
  return match ? PREFIX_TYPES[match[1]] ?? null : null;
}

async function readLinks() {
  try {
    const raw = await SecureStore.getItemAsync(LINKS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

const normalize = token => String(token ?? "").trim().toUpperCase().replace(/^FDG-/, "");

/**
 * Si este QR de un pase de prueba de Google Wallet se vinculó antes en este celular, devuelve el código real de su tarjeta.
 * Solo para pases antiguos: los pases que emite el backend ya llevan el código real de la tarjeta.
 */
export async function resolveLinkedToken(token) {
  const links = await readLinks();
  return links[normalize(token)] ?? null;
}
