import { useCallback, useState } from "react";
import * as Haptics from "expo-haptics";
import * as cardService from "../services/cardService";
import { useBranch } from "./useBranch";
import { useToast } from "./useToast";
import { formatSoles } from "../utils/formatters";
import { syncWalletPass } from "../services/walletSync";

function levelName(card) {
  return card.program.levels.find(level => level.number === card.level)?.name || `Nivel ${card.level}`;
}

/**
 * Operaciones del cajero sobre una tarjeta. Cada acción valida que haya un local elegido,
 * evita el doble envío y devuelve la tarjeta actualizada por el backend.
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
        const updated = await request(selectedBranch.id);
        onCardUpdated(updated);
        // El pase de Google Wallet del cliente se actualiza en segundo plano con los nuevos valores.
        syncWalletPass(updated.qrToken).then(result => {
          if (result.updated) toast.success(result.message);
          else if (result.message) toast.error(result.message);
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        toast.success(typeof successMessage === "function" ? successMessage(updated) : successMessage);
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
        `${quantity === 1 ? "Acumulaste una estampilla" : `Acumulaste ${quantity} estampillas`}. Lleva ${Math.min(updated.stampBalance, updated.program.requiredStamps)} de ${updated.program.requiredStamps}.`
    );

  const redeemReward = reward =>
    execute("redeem", branchId => cardService.redeemReward(card.id, { branchId, rewardId: reward?.id ?? null }), `Premio canjeado: ${reward?.name ?? "premio del programa"}.`);

  // Cashback: cuánto ganó y su saldo. Niveles: puntos sumados y el nivel en el que quedó.
  const registerPurchase = amount =>
    execute("purchase", branchId => cardService.registerPurchase(card.id, { branchId, amount }), updated =>
      updated.type === cardService.PROGRAM_TYPES.LEVELS
        ? `Sumaste ${updated.points - card.points} puntos. Nivel actual: ${levelName(updated)} (${updated.points} pts).${updated.level > card.level ? " ¡Subió de nivel!" : ""}`
        : `Cashback acumulado: +${formatSoles(updated.cashbackBalance - card.cashbackBalance)}. Saldo de la tarjeta: ${formatSoles(updated.cashbackBalance)}.`
    );

  // Cashback o gift card: cuánto se descontó y el saldo que le queda al cliente.
  const chargeBalance = amount =>
    execute("charge", branchId => cardService.chargeBalance(card.id, { branchId, amount }), updated =>
      updated.type === cardService.PROGRAM_TYPES.GIFT_CARD
        ? `Cobro de ${formatSoles(amount)} realizado. Saldo de la gift card: ${formatSoles(updated.giftBalance)}.`
        : `Usaste ${formatSoles(amount)} de cashback. Saldo restante: ${formatSoles(updated.cashbackBalance)}.`
    );

  const toggleBlocked = () => {
    const nextStatus = card.status === "BLOCKED" ? "ACTIVE" : "BLOCKED";
    return execute("status", () => cardService.updateCardStatus(card.id, nextStatus), nextStatus === "BLOCKED" ? "Tarjeta bloqueada." : "Tarjeta reactivada.");
  };

  return { pendingAction, hasBranch: Boolean(selectedBranch), addStamps, redeemReward, registerPurchase, chargeBalance, toggleBlocked };
}
