import { apiClient, toPage } from "./apiClient";

export const TRANSACTION_LABELS = {
  STAMP: "Sello agregado",
  REDEMPTION: "Premio canjeado",
  PURCHASE: "Compra registrada",
  CASHBACK_EARNED: "Cashback ganado",
  CASHBACK_USED: "Cashback usado",
  POINTS_EARNED: "Puntos sumados",
  LEVEL_UP: "Subió de nivel",
  GIFT_CHARGE: "Cobro con gift card",
  BALANCE_CHARGE: "Saldo usado",
  DISCOUNT: "Descuento de promoción",
  REFERRAL_BONUS: "Premio por referido"
};

/** Indica si el movimiento suma (true) o descuenta (false) para mostrar el signo. */
export function isCreditTransaction(type) {
  return ["STAMP", "PURCHASE", "CASHBACK_EARNED", "POINTS_EARNED", "LEVEL_UP", "REFERRAL_BONUS"].includes(type);
}

function normalizeTransaction(transaction) {
  return {
    id: transaction.id,
    type: transaction.type,
    label: TRANSACTION_LABELS[transaction.type] ?? "Movimiento",
    amount: Number(transaction.amount ?? 0),
    unit: transaction.unit ?? (["STAMP", "REDEMPTION"].includes(transaction.type) ? "STAMPS" : "SOLES"),
    createdAt: transaction.createdAt,
    branchName: transaction.branchName ?? transaction.branch?.name ?? "",
    customerName: transaction.customerName ?? transaction.card?.customerName ?? "",
    programName: transaction.programName ?? transaction.card?.programName ?? "",
    programType: transaction.programType ?? transaction.card?.programType ?? null,
    cardQrToken: transaction.cardQrToken ?? transaction.card?.qrToken ?? null,
    canBeVoided: Boolean(transaction.canBeVoided)
  };
}

/** GET /transactions?branchId&programType&programId&page&size → movimientos del equipo, por local y por tarjeta. */
export async function getTransactions({ branchId, programType, programId, page = 0, size = 15, signal } = {}) {
  const params = { page, size, sort: "createdAt,desc" };
  if (branchId) params.branchId = branchId;
  if (programId) params.programId = programId;
  else if (programType) params.programType = programType;
  const { data } = await apiClient.get("/transactions", { params, signal });
  const result = toPage(data);
  return { ...result, items: result.items.map(normalizeTransaction) };
}

/** Normaliza las páginas que devuelve /cards/{id}/transactions. */
export function normalizeTransactions(items) {
  return items.map(normalizeTransaction);
}

/** DELETE /transactions/{id} → anula un movimiento reciente (por ejemplo, un sello por error). */
export async function voidTransaction(transactionId) {
  await apiClient.delete(`/transactions/${transactionId}`);
}
