import * as SecureStore from "expo-secure-store";
import { apiClient } from "./apiClient";
import { getProgramsByType } from "./programService";

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

/** Si este QR de Google Wallet ya se registró en este celular, devuelve el código real de su tarjeta. */
export async function resolveLinkedToken(token) {
  const links = await readLinks();
  return links[normalize(token)] ?? null;
}

/**
 * Registra en el backend una tarjeta de prueba de Google Wallet cuyo código no existe:
 * crea al cliente en el local del programa (el backend le entrega su tarjeta con un QR real)
 * y guarda en este celular la relación QR de Wallet → tarjeta real, para que los próximos escaneos la abran directo.
 */
/** Programas activos del tipo de la tarjeta; primero los del local elegido. */
export async function getLinkablePrograms(walletToken, branchId) {
  const type = cardTypeFromToken(walletToken);
  if (!type) return [];
  const programs = (await getProgramsByType(type.key)).filter(program => program.status === "Activa");
  return programs.sort((a, b) => Number(b.branchId === branchId) - Number(a.branchId === branchId));
}

export async function linkWalletCard({ walletToken, customerName, program }) {
  const type = cardTypeFromToken(walletToken);
  if (!type) throw new Error("Este código no parece una tarjeta de Fidegresa.");
  if (!program) throw new Error("Elige el programa de la tarjeta (el nombre que aparece en el pase).");

  const email = `caja.${Date.now()}@fidegresa.app`;
  const { data: customer } = await apiClient.post("/customers", { fullName: customerName, email, localId: program.branchId });
  const { data: detail } = await apiClient.get(`/customers/${customer.id}`);
  const issued = (detail.tarjetas ?? []).find(card => card.programaId === program.id);
  if (!issued?.qrToken) throw new Error("El backend no entregó la tarjeta. Revisa que el programa esté activo en su local.");

  const links = await readLinks();
  links[normalize(walletToken)] = issued.qrToken;
  await SecureStore.setItemAsync(LINKS_KEY, JSON.stringify(links));
  return issued.qrToken;
}
