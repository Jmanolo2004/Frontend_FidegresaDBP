import { API_URL, apiClient, toPage } from "./apiClient";
import { roundToCents } from "../utils/formatters";

export const PROGRAM_TYPES = {
  STAMPS: "STAMPS",
  CASHBACK: "CASHBACK",
  LEVELS: "LEVELS",
  GIFT_CARD: "GIFT_CARD"
};

const toNumber = (value, fallback = 0) => (value == null || Number.isNaN(Number(value)) ? fallback : Number(value));

/** Deja la tarjeta del backend en una forma estable para la UI. */
export function normalizeCard(card) {
  const program = card.program ?? {};
  return {
    id: card.id,
    qrToken: card.qrToken,
    serialNumber: card.serialNumber,
    status: card.status ?? "ACTIVE",
    type: card.programType ?? program.type ?? PROGRAM_TYPES.STAMPS,
    expiresAt: card.expiresAt ?? null,
    customer: {
      id: card.customer?.id,
      fullName: card.customer?.fullName ?? "Cliente",
      email: card.customer?.email ?? ""
    },
    program: {
      id: program.id,
      name: program.name ?? "Programa",
      businessName: program.businessName ?? "",
      requiredStamps: toNumber(program.requiredStamps, 10),
      cashbackPercent: toNumber(program.cashbackPercent),
      pointsPerSol: toNumber(program.pointsPerSol, 1),
      levels: (program.levels ?? []).map(level => ({
        number: toNumber(level.number),
        name: level.name ?? `Nivel ${level.number}`,
        minPoints: toNumber(level.minPoints),
        benefit: level.benefit ?? ""
      })),
      rewards: (program.rewards ?? []).map(reward => ({
        id: reward.id,
        name: reward.name,
        requiredStamps: toNumber(reward.requiredStamps)
      }))
    },
    stampBalance: toNumber(card.stampBalance),
    cashbackBalance: toNumber(card.cashbackBalance),
    points: toNumber(card.points),
    level: toNumber(card.level, 1),
    giftBalance: toNumber(card.giftBalance),
    giftInitialAmount: toNumber(card.giftInitialAmount),
    // Lo que calcula el backend con las reglas del programa: dato principal, avance ("Te faltan 2 sellos…") y si ya completó.
    display: card.display ?? null,
    // Promociones vigentes para este cliente que el cajero puede aplicar.
    promotions: (card.promotions ?? []).map(promotion => ({
      id: promotion.id,
      name: promotion.name ?? "Promoción",
      description: promotion.description ?? "",
      discountType: promotion.discountType,
      discountValue: toNumber(promotion.discountValue),
      discountLabel: promotion.discountLabel ?? "",
      endsOn: promotion.endsOn ?? null
    }))
  };
}

/** Descuento que dará una promoción sobre una compra (el backend lo vuelve a calcular al aplicarlo). */
export function previewDiscount(promotion, amount) {
  if (!promotion || !Number.isFinite(amount) || amount <= 0) return 0;
  const raw = promotion.discountType === "PERCENT" ? (amount * promotion.discountValue) / 100 : Math.min(promotion.discountValue, amount);
  return roundToCents(raw);
}

/** Enlace corto que crea el pase y abre "Guardar en Google Wallet"; se muestra como QR para el celular del cliente. */
export function walletSaveUrl(qrToken) {
  return qrToken ? `${API_URL}/public/cards/${encodeURIComponent(qrToken)}/google-wallet/save` : null;
}

/** GET /branches/{id}/registration-options → programas a los que se puede unir el cliente en el local y el texto de consentimiento. */
export async function getRegistrationOptions(branchId, { signal } = {}) {
  const { data } = await apiClient.get(`/branches/${branchId}/registration-options`, { signal });
  return {
    branchName: data.branchName ?? "",
    consentText: data.consentText ?? "",
    programs: (data.programs ?? []).map(program => ({
      id: program.id,
      name: program.name ?? "Programa",
      type: program.type,
      color: /^#[0-9a-f]{6}$/i.test(program.primaryColor ?? "") ? program.primaryColor : null
    }))
  };
}

/**
 * POST /cards/register → registra al cliente (con su consentimiento) y le entrega su tarjeta.
 * Devuelve { alreadyRegistered, card, walletSaveUrl, inviteLink }.
 */
export async function registerCustomer({ branchId, programId, fullName, email, phone, birthday, consent, referralCode }) {
  const { data } = await apiClient.post("/cards/register", {
    branchId,
    programId,
    fullName,
    email,
    phone,
    birthday: birthday || null,
    consent,
    referralCode: referralCode || null
  });
  return {
    alreadyRegistered: Boolean(data.alreadyRegistered),
    card: normalizeCard(data.card),
    walletSaveUrl: data.walletSaveUrl ?? null,
    inviteLink: data.inviteLink ?? null
  };
}

/** POST /cards/{id}/discounts { branchId, promotionId, amount } → descuento aplicado y la tarjeta actualizada. */
export async function applyDiscount(cardId, { branchId, promotionId, amount }) {
  const { data } = await apiClient.post(`/cards/${cardId}/discounts`, { branchId, promotionId, amount: roundToCents(amount) });
  return {
    promotionName: data.promotionName ?? "Promoción",
    purchaseAmount: toNumber(data.purchaseAmount),
    discount: toNumber(data.discount),
    total: toNumber(data.total),
    card: normalizeCard(data.card)
  };
}

/** GET /cards/qr/{qrToken} → tarjeta escaneada. */
export async function getCardByQr(qrToken, { signal } = {}) {
  const { data } = await apiClient.get(`/cards/qr/${encodeURIComponent(qrToken)}`, { signal });
  return normalizeCard(data);
}

/** POST /cards/{id}/stamps { branchId, quantity } → tarjeta actualizada. */
export async function addStamps(cardId, { branchId, quantity }) {
  const { data } = await apiClient.post(`/cards/${cardId}/stamps`, { branchId, quantity });
  return normalizeCard(data);
}

/** POST /cards/{id}/redemptions { branchId, rewardId } → canjea el premio de estampillas. */
export async function redeemReward(cardId, { branchId, rewardId }) {
  const { data } = await apiClient.post(`/cards/${cardId}/redemptions`, { branchId, rewardId });
  return normalizeCard(data);
}

/** POST /cards/{id}/purchases { branchId, amount } → suma cashback o puntos de nivel. */
export async function registerPurchase(cardId, { branchId, amount }) {
  const { data } = await apiClient.post(`/cards/${cardId}/purchases`, { branchId, amount: roundToCents(amount) });
  return normalizeCard(data);
}

/** POST /cards/{id}/balance-charges { branchId, amount } → descuenta saldo de cashback o gift card. */
export async function chargeBalance(cardId, { branchId, amount }) {
  const { data } = await apiClient.post(`/cards/${cardId}/balance-charges`, { branchId, amount: roundToCents(amount) });
  return normalizeCard(data);
}

/** PATCH /cards/{id}/status { status } → bloquea o reactiva la tarjeta. */
export async function updateCardStatus(cardId, status) {
  const { data } = await apiClient.patch(`/cards/${cardId}/status`, { status });
  return normalizeCard(data);
}

/** GET /cards/{id}/transactions?page&size → últimos movimientos de la tarjeta. */
export async function getCardTransactions(cardId, { page = 0, size = 5, signal } = {}) {
  const { data } = await apiClient.get(`/cards/${cardId}/transactions`, { params: { page, size, sort: "createdAt,desc" }, signal });
  return toPage(data);
}
