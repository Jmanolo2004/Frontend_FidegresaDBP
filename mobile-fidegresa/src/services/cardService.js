import { apiClient, toPage } from "./apiClient";
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
    giftInitialAmount: toNumber(card.giftInitialAmount)
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
