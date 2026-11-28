import { useCallback, useState } from "react";
import * as Haptics from "expo-haptics";
import * as cardService from "../services/cardService";
import { useBranch } from "./useBranch";
import { useToast } from "./useToast";
import { formatSoles } from "../utils/formatters";

function levelName(card) {
  return card.program.levels.find(level => level.number === card.level)?.name || `Nivel ${card.level}`;
}

/** Texto de avance que calcula el backend ("Te faltan 2 sellos para: Un café gratis"), si llegó. */
function progress(card) {
  const text = card.display?.progressText;
  return text ? ` ${text}.` : "";
}

/** ¿El movimiento completó la tarjeta o subió de nivel? Se celebra con una vibración más fuerte. */
function milestone(before, after) {
  if (after.type === cardService.PROGRAM_TYPES.LEVELS && after.level > before.level) return `¡Subió a ${levelName(after)}!`;
  if (after.type === cardService.PROGRAM_TYPES.STAMPS && after.display?.completed && !before.display?.completed) return "¡Completó su tarjeta!";
  return null;
}

/**
 * Operaciones del cajero sobre una tarjeta. Cada acción valida que haya un local elegido,
 * evita el doble envío y devuelve la tarjeta actualizada por el backend.
 * El pase de Google Wallet del cliente lo actualiza el backend solo, después de cada movimiento.
 */
export function useCardActions(card, onCardUpdated) {
  const { selectedBranch } = useBranch();
  const toast = useToast();
  const [pendingAction, setPendingAction] = useState(null);

  const execute = useCallback(
    async (actionName, request, successMessage) => {
      if (!card || pendingAction) return false;
      if (!selectedBranch) {
        toast.error("Elige el local donde estás antes de registrar movimientos.");
        return false;
      }
      setPendingAction(actionName);
      try {
        const result = await request(selectedBranch.id);
        const updated = result.card ?? result;
        onCardUpdated(updated);
        const celebration = milestone(card, updated);
        if (celebration) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), 180);
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }
        const message = typeof successMessage === "function" ? successMessage(updated, result) : successMessage;
        toast.success(celebration ? `${celebration} ${message}` : message);
        return true;
      } catch (error) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        toast.error(error.message);
        return false;
      } finally {
        setPendingAction(null);
      }
    },
    [card, pendingAction, selectedBranch, toast, onCardUpdated]
  );

  const addStamps = quantity =>
    execute(
      "stamps",
      branchId => cardService.addStamps(card.id, { branchId, quantity }),
      updated =>
        `${quantity === 1 ? "Sello agregado" : `${quantity} sellos agregados`}: lleva ${Math.min(updated.stampBalance, updated.program.requiredStamps)} de ${updated.program.requiredStamps}.${progress(updated)}`
    );

  const redeemReward = reward =>
    execute("redeem", branchId => cardService.redeemReward(card.id, { branchId, rewardId: reward?.id ?? null }), `Premio canjeado: ${reward?.name ?? "premio del programa"}.`);

  // Cashback: cuánto ganó y su saldo. Niveles: puntos sumados y lo que le falta para el siguiente nivel.
  const registerPurchase = amount =>
    execute("purchase", branchId => cardService.registerPurchase(card.id, { branchId, amount }), updated =>
      updated.type === cardService.PROGRAM_TYPES.LEVELS
        ? `Sumó ${updated.points - card.points} puntos (${updated.points} en total).${progress(updated)}`
        : `Cashback ganado: +${formatSoles(updated.cashbackBalance - card.cashbackBalance)}. Saldo: ${formatSoles(updated.cashbackBalance)}.`
    );

  // Gift card: la compra en caja carga saldo (el cliente paga la recarga y el monto queda en su tarjeta).
  const loadGiftCard = amount =>
    execute("load", branchId => cardService.registerPurchase(card.id, { branchId, amount }), updated =>
      `Recarga de ${formatSoles(amount)} lista. Saldo de la gift card: ${formatSoles(updated.giftBalance)}.`
    );

  // Cashback o gift card: cuánto se descontó y el saldo que le queda al cliente.
  const chargeBalance = amount =>
    execute("charge", branchId => cardService.chargeBalance(card.id, { branchId, amount }), updated =>
      updated.type === cardService.PROGRAM_TYPES.GIFT_CARD
        ? `Cobro de ${formatSoles(amount)} realizado. Saldo de la gift card: ${formatSoles(updated.giftBalance)}.`
        : `Usaste ${formatSoles(amount)} de cashback. Saldo restante: ${formatSoles(updated.cashbackBalance)}.`
    );

  // Promoción: el backend calcula el descuento; el cajero cobra el total que devuelve.
  const applyDiscount = (promotion, amount) =>
    execute(
      "discount",
      branchId => cardService.applyDiscount(card.id, { branchId, promotionId: promotion.id, amount }),
      (updated, result) => `${result.promotionName}: descuento de ${formatSoles(result.discount)}. Cobra ${formatSoles(result.total)}.`
    );

  const toggleBlocked = () => {
    const nextStatus = card.status === "BLOCKED" ? "ACTIVE" : "BLOCKED";
    return execute("status", () => cardService.updateCardStatus(card.id, nextStatus), nextStatus === "BLOCKED" ? "Tarjeta bloqueada." : "Tarjeta reactivada.");
  };

  return { pendingAction, hasBranch: Boolean(selectedBranch), addStamps, redeemReward, registerPurchase, loadGiftCard, chargeBalance, applyDiscount, toggleBlocked };
}
