import { useCallback, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppButton } from "../components/AppButton";
import { ConfirmSheet } from "../components/ConfirmSheet";
import { CardActions } from "../components/card/CardActions";
import { LoyaltyCardView } from "../components/card/LoyaltyCardView";
import { CardSkeleton, ErrorView } from "../components/StateViews";
import { TransactionRow } from "../components/TransactionRow";
import { useAsync } from "../hooks/useAsync";
import { useCardActions } from "../hooks/useCardActions";
import { useToast } from "../hooks/useToast";
import { useBranch } from "../hooks/useBranch";
import { getCardByQr, getCardTransactions, walletSaveUrl } from "../services/cardService";
import { resolveLinkedToken } from "../services/walletLinks";
import { getProgramStyle } from "../services/programService";
import { WalletQrSheet } from "../components/card/WalletQrSheet";
import { normalizeTransactions, voidTransaction } from "../services/transactionService";
import { formatSoles } from "../utils/formatters";
import { colors, fonts, programColors, radius, spacing, typography } from "../utils/theme";

/** Detalle de la tarjeta escaneada con las acciones de su programa y sus últimos movimientos. */
export function CardScreen({ qrToken, mode = "card" }) {
  const toast = useToast();
  const { selectedBranch } = useBranch();
  // Primero busca el código tal cual; si es una tarjeta de Wallet ya registrada en este celular, usa su tarjeta real.
  const cardRequest = useAsync(async ({ signal }) => {
    const linked = await resolveLinkedToken(qrToken);
    return getCardByQr(linked ?? qrToken, { signal });
  }, qrToken);
  const card = cardRequest.data;
  const style = useAsync(
    ({ signal }) => (card?.program?.id ? getProgramStyle(card.program.id, { signal }).catch(() => null) : Promise.resolve(null)),
    `style-${card?.program?.id ?? "none"}`
  );
  const movements = useAsync(({ signal }) => (card?.id ? getCardTransactions(card.id, { signal }) : Promise.resolve(null)), card?.id ?? "none");
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [voidTarget, setVoidTarget] = useState(null);
  const [voiding, setVoiding] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);

  const { setData: setCard, reload: reloadCard } = cardRequest;
  const { reload: reloadMovements } = movements;
  const handleCardUpdated = useCallback(
    updated => {
      setCard(updated);
      reloadMovements();
    },
    [setCard, reloadMovements]
  );
  const actions = useCardActions(card, handleCardUpdated);

  const refresh = useCallback(() => {
    reloadCard();
    reloadMovements();
  }, [reloadCard, reloadMovements]);

  const confirmVoid = async () => {
    if (!voidTarget) return;
    setVoiding(true);
    try {
      await voidTransaction(voidTarget.id);
      toast.success("Movimiento anulado.");
      setVoidTarget(null);
      refresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setVoiding(false);
    }
  };

  if (cardRequest.loading && !card) {
    return (
      <>
        <Stack.Screen options={{ title: "Buscando tarjeta…" }} />
        <CardSkeleton />
      </>
    );
  }

  if (cardRequest.error && !card) {
    const notFound = cardRequest.error.status === 404;
    return (
      <>
        <Stack.Screen options={{ title: "Tarjeta" }} />
        <ErrorView
          title={notFound ? "No encontramos esta tarjeta" : "No pudimos cargar la tarjeta"}
          error={
            notFound
              ? { message: "El código no corresponde a ninguna tarjeta de tu negocio. Si el cliente todavía no es parte del club, regístralo ahora." }
              : cardRequest.error
          }
          icon={notFound ? "search-outline" : "cloud-offline-outline"}
          onRetry={notFound ? undefined : cardRequest.reload}
        >
          {notFound ? <AppButton label="Registrar cliente nuevo" icon="person-add-outline" onPress={() => router.replace("/register")} /> : null}
          <AppButton label="Escanear otra tarjeta" icon="scan-outline" variant="ghost" onPress={() => router.back()} />
        </ErrorView>
      </>
    );
  }

  if (!card) return null;
  const blocked = card.status === "BLOCKED";
  const movementItems = movements.data ? normalizeTransactions(movements.data.items) : [];

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <Stack.Screen
        options={{
          title: card.customer.fullName,
          headerRight: () => (
            <Pressable accessibilityRole="button" accessibilityLabel={blocked ? "Reactivar tarjeta" : "Bloquear tarjeta"} onPress={() => setStatusConfirmOpen(true)} hitSlop={10}>
              <Ionicons name={blocked ? "lock-open-outline" : "lock-closed-outline"} size={22} color={colors.onDark} />
            </Pressable>
          )
        }}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={cardRequest.loading && Boolean(card)} onRefresh={refresh} tintColor={colors.caramel} colors={[colors.caramel]} />}
      >
        <LoyaltyCardView card={card} color={style.data?.color ?? null} branchName={style.data?.branchName ?? ""} />
        {card.display?.progressText ? <ProgressBand display={card.display} /> : null}
        {mode === "reward" ? <RewardBanner card={card} /> : null}
        <CardActions card={card} actions={actions} mode={mode} />

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Últimos movimientos</Text>
            {movementItems.length ? <Text style={styles.sectionCount}>{movementItems.length}</Text> : null}
          </View>
          {movements.loading && !movements.data ? (
            <Text style={styles.muted}>Cargando movimientos…</Text>
          ) : movements.error ? (
            <View style={styles.inlineError}>
              <Text style={styles.muted}>{movements.error.message}</Text>
              <AppButton label="Reintentar" variant="secondary" icon="refresh" onPress={movements.reload} />
            </View>
          ) : movementItems.length === 0 ? (
            <Text style={styles.muted}>Esta tarjeta todavía no tiene movimientos.</Text>
          ) : (
            movementItems.map((movement, index) => (
              <View key={movement.id} style={index > 0 ? styles.divider : null}>
                <TransactionRow transaction={movement} showCustomer={false} currentBranchName={selectedBranch?.name} onVoid={setVoidTarget} voiding={voiding && voidTarget?.id === movement.id} />
              </View>
            ))
          )}
        </View>

        <View style={styles.footerActions}>
          <AppButton label="Guardar en Google Wallet" icon="wallet" variant="wallet" onPress={() => setWalletOpen(true)} accessibilityHint="Muestra un QR para que el cliente guarde su tarjeta" />
          <AppButton label="Escanear otra tarjeta" icon="scan-outline" variant="secondary" onPress={() => router.back()} />
        </View>
      </ScrollView>

      <WalletQrSheet
        visible={walletOpen}
        url={walletSaveUrl(card.qrToken)}
        customerName={card.customer.fullName}
        businessName={style.data?.branchName || card.program.businessName}
        onClose={() => setWalletOpen(false)}
      />

      <ConfirmSheet
        visible={statusConfirmOpen}
        title={blocked ? "¿Reactivar la tarjeta?" : "¿Bloquear la tarjeta?"}
        message={blocked ? "El cliente podrá volver a sumar y usar beneficios." : "Úsalo si el cliente reporta que perdió su celular o ves un uso sospechoso. No se podrán registrar movimientos hasta reactivarla."}
        confirmLabel={blocked ? "Reactivar" : "Bloquear"}
        confirmVariant={blocked ? "primary" : "danger"}
        loading={actions.pendingAction === "status"}
        onConfirm={async () => {
          await actions.toggleBlocked();
          setStatusConfirmOpen(false);
        }}
        onCancel={() => setStatusConfirmOpen(false)}
      />
      <ConfirmSheet
        visible={voidTarget !== null}
        title="¿Anular este movimiento?"
        message={voidTarget ? `Se revertirá "${voidTarget.label}" en la tarjeta de ${card.customer.fullName}.` : ""}
        confirmLabel="Anular"
        confirmVariant="danger"
        loading={voiding}
        onConfirm={confirmVoid}
        onCancel={() => setVoidTarget(null)}
      />
    </KeyboardAvoidingView>
  );
}

const TYPE_LABELS = { STAMPS: "Estampillas", CASHBACK: "Cashback", LEVELS: "Niveles", GIFT_CARD: "Gift card" };

/** Qué recompensa tiene el cliente según el tipo de tarjeta que se detectó al escanear. */
function rewardMessage(card) {
  switch (card.type) {
    case "CASHBACK":
      return `Saldo disponible: ${formatSoles(card.cashbackBalance)}. Usa "Usar saldo" para descontarlo de la compra.`;
    case "LEVELS": {
      const level = card.program.levels.find(item => item.number === card.level);
      const benefit = level?.benefit ? `Beneficio: ${level.benefit}.` : "Este nivel no tiene un beneficio registrado.";
      return `Nivel ${level?.name || card.level} con ${card.points} puntos. ${benefit}`;
    }
    case "GIFT_CARD":
      return `Saldo de regalo: ${formatSoles(card.giftBalance)}. Cobra el monto de la compra con la gift card.`;
    default: {
      const missing = Math.max(0, card.program.requiredStamps - card.stampBalance);
      return missing === 0
        ? "¡Tarjeta completa! Canjea el premio con el botón de abajo."
        : `Le faltan ${missing} ${missing === 1 ? "sello" : "sellos"} para el premio. Todavía no puede canjear.`;
    }
  }
}

/** Avance de la tarjeta, como la franja de resumen de la landing: verde cuando ya completó. */
function ProgressBand({ display }) {
  const done = display.completed;
  const percent = Math.max(0, Math.min(100, display.progressPercent ?? 0));
  return (
    <View style={[styles.progress, done && styles.progressDone]} accessibilityLabel={display.progressText}>
      <View style={styles.progressRow}>
        <Ionicons name={done ? "checkmark-circle" : "trending-up"} size={20} color={done ? colors.white : colors.espresso} />
        <Text style={[styles.progressText, done && { color: colors.white }]}>{display.progressText}</Text>
      </View>
      {!done ? (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${percent}%` }]} />
        </View>
      ) : null}
    </View>
  );
}

function RewardBanner({ card }) {
  return (
    <View style={styles.reward}>
      <View style={[styles.rewardIcon, { backgroundColor: programColors[card.type] ?? colors.caramel }]}>
        <Ionicons name="gift" size={20} color={colors.white} />
      </View>
      <View style={styles.rewardBody}>
        <Text style={styles.rewardTitle}>Recompensa · {TYPE_LABELS[card.type] ?? "Tarjeta"}</Text>
        <Text style={styles.rewardText}>{rewardMessage(card)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  reward: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start", backgroundColor: colors.espresso, borderRadius: radius.lg, padding: spacing.lg },
  rewardIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  rewardBody: { flex: 1, gap: 4 },
  rewardTitle: { ...typography.subtitle, color: colors.caramel },
  rewardText: { ...typography.body, color: colors.onDark },
  flex: { flex: 1, backgroundColor: colors.cream },
  progress: { backgroundColor: colors.kraft, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  progressDone: { backgroundColor: colors.success },
  progressRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  progressText: { flex: 1, fontFamily: fonts.display, fontSize: 17, lineHeight: 22, color: colors.espresso },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: "rgba(36,21,16,0.15)", overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4, backgroundColor: colors.espresso },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  section: { backgroundColor: colors.paper, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.sm },
  sectionTitle: typography.title,
  sectionCount: { fontFamily: fonts.bold, fontSize: 13, color: colors.muted, backgroundColor: colors.kraftSoft, paddingHorizontal: 10, paddingVertical: 2, borderRadius: radius.pill, overflow: "hidden" },
  muted: { ...typography.body, color: colors.muted, paddingVertical: spacing.sm },
  inlineError: { gap: spacing.sm, paddingBottom: spacing.sm },
  divider: { borderTopWidth: 1, borderTopColor: colors.line },
  footerActions: { gap: spacing.md }
});
