import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppButton } from "../AppButton";
import { ConfirmSheet } from "../ConfirmSheet";
import { AmountAction } from "./AmountAction";
import { PROGRAM_TYPES, previewDiscount } from "../../services/cardService";
import { formatSoles, roundToCents } from "../../utils/formatters";
import { colors, fonts, radius, spacing, typography } from "../../utils/theme";

/** Acciones del cajero según el tipo de programa de la tarjeta escaneada. */
export function CardActions({ card, actions, mode = "card" }) {
  if (card.status === "BLOCKED" || card.status === "INACTIVE") {
    return (
      <Notice icon="lock-closed-outline" tone="danger">
        Esta tarjeta está {card.status === "BLOCKED" ? "bloqueada" : "inactiva"}. Reactívala desde el menú para registrar movimientos.
      </Notice>
    );
  }

  return (
    <View style={styles.wrapper}>
      {!actions.hasBranch ? (
        <Notice icon="storefront-outline" tone="warning">
          Elige tu local en la pestaña Escanear para poder registrar movimientos.
        </Notice>
      ) : null}
      {card.promotions?.length ? <PromotionsActions card={card} actions={actions} /> : null}
      {card.type === PROGRAM_TYPES.CASHBACK ? <CashbackActions card={card} actions={actions} initialMode={mode === "reward" ? "use" : "earn"} /> : null}
      {card.type === PROGRAM_TYPES.LEVELS ? <LevelsActions card={card} actions={actions} /> : null}
      {card.type === PROGRAM_TYPES.GIFT_CARD ? <GiftCardActions card={card} actions={actions} /> : null}
      {card.type === PROGRAM_TYPES.STAMPS ? <StampsActions card={card} actions={actions} /> : null}
    </View>
  );
}

function StampsActions({ card, actions }) {
  const [quantity, setQuantity] = useState(1);
  const [confirm, setConfirm] = useState(null); // "stamps" | "redeem"
  const required = card.program.requiredStamps;
  const remaining = Math.max(0, required - card.stampBalance);
  const rewardReady = card.stampBalance >= required;
  const eligibleRewards = card.program.rewards.filter(reward => reward.requiredStamps <= card.stampBalance);
  const [rewardId, setRewardId] = useState(null);
  const selectedReward = eligibleRewards.find(reward => reward.id === rewardId) ?? eligibleRewards[0] ?? null;
  const maxQuantity = Math.max(1, Math.min(5, remaining || 5));
  const disabled = !actions.hasBranch;

  const runConfirmed = async () => {
    const ok = confirm === "redeem" ? await actions.redeemReward(selectedReward) : await actions.addStamps(quantity);
    setConfirm(null);
    if (ok) setQuantity(1);
  };

  return (
    <Section title="Registrar visita">
      {rewardReady ? (
        <Notice icon="gift-outline" tone="success">
          ¡{card.customer.fullName.split(" ")[0]} completó su tarjeta! Puede canjear su premio ahora.
        </Notice>
      ) : (
        <Text style={styles.caption}>{remaining === 1 ? "Le falta 1 sello para el premio." : `Le faltan ${remaining} sellos para el premio.`}</Text>
      )}

      {!rewardReady ? (
        <View style={styles.stepperRow}>
          <Text style={styles.stepperLabel}>Sellos a agregar</Text>
          <View style={styles.stepper}>
            <StepperButton icon="remove" label="Quitar un sello" onPress={() => setQuantity(value => Math.max(1, value - 1))} disabled={quantity <= 1} />
            <Text style={styles.stepperValue} accessibilityLiveRegion="polite">
              {quantity}
            </Text>
            <StepperButton icon="add" label="Agregar un sello" onPress={() => setQuantity(value => Math.min(maxQuantity, value + 1))} disabled={quantity >= maxQuantity} />
          </View>
        </View>
      ) : null}

      {!rewardReady ? (
        <AppButton label={quantity === 1 ? "Acumular estampillas (1)" : `Acumular estampillas (${quantity})`} icon="add-circle-outline" onPress={() => setConfirm("stamps")} disabled={disabled} loading={actions.pendingAction === "stamps"} />
      ) : (
        <>
          {eligibleRewards.length > 1 ? (
            <View style={styles.chips}>
              {eligibleRewards.map(reward => (
                <Pressable key={reward.id} accessibilityRole="radio" accessibilityState={{ selected: reward.id === selectedReward?.id }} onPress={() => setRewardId(reward.id)} style={[styles.chip, reward.id === selectedReward?.id && styles.chipSelected]}>
                  <Text style={[styles.chipText, reward.id === selectedReward?.id && styles.chipTextSelected]}>{reward.name}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <AppButton label={`Canjear ${selectedReward?.name ?? "premio"}`} icon="gift" variant="accent" onPress={() => setConfirm("redeem")} disabled={disabled} loading={actions.pendingAction === "redeem"} />
        </>
      )}

      <ConfirmSheet
        visible={confirm !== null}
        title={confirm === "redeem" ? "¿Canjear el premio?" : "¿Agregar sellos?"}
        message={
          confirm === "redeem"
            ? `Se entregará "${selectedReward?.name ?? "el premio"}" a ${card.customer.fullName} y la tarjeta volverá a empezar.`
            : `Se ${quantity === 1 ? "agregará 1 sello" : `agregarán ${quantity} sellos`} a la tarjeta de ${card.customer.fullName}.`
        }
        confirmLabel={confirm === "redeem" ? "Canjear" : "Agregar"}
        confirmVariant={confirm === "redeem" ? "accent" : "primary"}
        loading={actions.pendingAction === "stamps" || actions.pendingAction === "redeem"}
        onConfirm={runConfirmed}
        onCancel={() => setConfirm(null)}
      />
    </Section>
  );
}

/** Promociones vigentes del cliente: el cajero elige una, escribe el monto de la compra y el backend calcula el descuento. */
function PromotionsActions({ card, actions }) {
  const [promotionId, setPromotionId] = useState(null);
  const selected = card.promotions.find(promotion => promotion.id === promotionId) ?? card.promotions[0];

  return (
    <Section title={card.promotions.length === 1 ? "Promoción para este cliente" : "Promociones para este cliente"}>
      {card.promotions.length > 1 ? (
        <View style={styles.chips}>
          {card.promotions.map(promotion => (
            <Pressable
              key={promotion.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: promotion.id === selected.id }}
              onPress={() => setPromotionId(promotion.id)}
              style={[styles.chip, promotion.id === selected.id && styles.chipSelected]}
            >
              <Text style={[styles.chipText, promotion.id === selected.id && styles.chipTextSelected]}>
                {promotion.discountLabel} · {promotion.name}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <Notice icon="pricetag-outline" tone="success">
        {selected.name}: {selected.discountLabel} de descuento{selected.description ? `. ${selected.description}` : ""}
      </Notice>
      <AmountAction
        key={selected.id}
        label="Monto de la compra"
        buttonLabel="Aplicar descuento"
        buttonIcon="pricetag-outline"
        describe={amount => {
          const discount = previewDiscount(selected, amount);
          return `Descuento ${formatSoles(discount)} · Cobrar ${formatSoles(roundToCents(amount - discount))}.`;
        }}
        confirmTitle="¿Aplicar la promoción?"
        confirmMessage={amount => {
          const discount = previewDiscount(selected, amount);
          return `${selected.name} para ${card.customer.fullName}: compra de ${formatSoles(amount)}, descuento de ${formatSoles(discount)}. Cobra ${formatSoles(roundToCents(amount - discount))}.`;
        }}
        loading={actions.pendingAction === "discount"}
        disabled={!actions.hasBranch}
        onSubmit={amount => actions.applyDiscount(selected, amount)}
      />
    </Section>
  );
}

function CashbackActions({ card, actions, initialMode = "earn" }) {
  const [mode, setMode] = useState(initialMode);
  const percent = card.program.cashbackPercent;
  const balance = card.cashbackBalance;
  const disabled = !actions.hasBranch;

  return (
    <Section title="Cashback">
      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: "earn", label: "Registrar compra" },
          { value: "use", label: "Usar saldo" }
        ]}
      />
      {mode === "earn" ? (
        <AmountAction
          key="earn"
          label="Monto de la compra"
          buttonLabel="Registrar compra"
          buttonIcon="receipt-outline"
          describe={amount => `Ganará ${formatSoles(roundToCents((amount * percent) / 100))} de cashback (${percent}%).`}
          confirmTitle="¿Registrar la compra?"
          confirmMessage={amount => `Compra de ${formatSoles(amount)}. ${card.customer.fullName} recibirá ${formatSoles(roundToCents((amount * percent) / 100))} de cashback.`}
          loading={actions.pendingAction === "purchase"}
          disabled={disabled}
          onSubmit={amount => actions.registerPurchase(amount, updated => `Compra registrada. Nuevo saldo: ${formatSoles(updated.cashbackBalance)}.`)}
        />
      ) : balance <= 0 ? (
        <Text style={styles.caption}>El cliente todavía no tiene saldo de cashback para usar.</Text>
      ) : (
        <AmountAction
          key="use"
          label="Monto a descontar"
          buttonLabel="Usar saldo"
          buttonIcon="wallet-outline"
          max={balance}
          maxLabel={`El saldo disponible es ${formatSoles(balance)}.`}
          quickAmounts={[{ label: `Todo (${formatSoles(balance)})`, value: balance }]}
          describe={amount => `Quedarán ${formatSoles(Math.max(0, roundToCents(balance - amount)))} de saldo.`}
          confirmTitle="¿Usar saldo de cashback?"
          confirmMessage={amount => `Se descontarán ${formatSoles(amount)} del saldo de ${card.customer.fullName}.`}
          loading={actions.pendingAction === "charge"}
          disabled={disabled}
          onSubmit={amount => actions.chargeBalance(amount, updated => `Saldo usado. Quedan ${formatSoles(updated.cashbackBalance)}.`)}
        />
      )}
    </Section>
  );
}

function LevelsActions({ card, actions }) {
  const levels = card.program.levels;
  const nextLevel = levels.find(level => level.number === card.level + 1);
  const currentLevel = levels.find(level => level.number === card.level);
  const pointsPerSol = card.program.pointsPerSol || 1;
  const pointsFor = amount => Math.floor(amount * pointsPerSol);

  return (
    <Section title="Sumar puntos">
      {currentLevel?.benefit ? (
        <Notice icon="star-outline" tone="success">
          Beneficio de {currentLevel.name}: {currentLevel.benefit}
        </Notice>
      ) : null}
      <Text style={styles.caption}>
        {nextLevel ? `Le faltan ${Math.max(0, nextLevel.minPoints - card.points)} puntos para ${nextLevel.name}.` : "Ya está en el nivel más alto del programa."}
      </Text>
      <AmountAction
        label="Monto de la compra"
        buttonLabel="Registrar compra"
        buttonIcon="trending-up-outline"
        describe={amount => {
          const earned = pointsFor(amount);
          const reachesNext = nextLevel && card.points + earned >= nextLevel.minPoints;
          return `Sumará ${earned} puntos${reachesNext ? ` y subirá a ${nextLevel.name}` : ""}.`;
        }}
        confirmTitle="¿Registrar la compra?"
        confirmMessage={amount => `Compra de ${formatSoles(amount)}: ${card.customer.fullName} sumará ${pointsFor(amount)} puntos.`}
        loading={actions.pendingAction === "purchase"}
        disabled={!actions.hasBranch}
        onSubmit={amount =>
          actions.registerPurchase(amount, updated => (updated.level > card.level ? `¡Subió a Nivel ${updated.level}!` : `Puntos sumados. Ahora tiene ${updated.points}.`))
        }
      />
    </Section>
  );
}

/** Gift card: el staff carga saldo cuando el cliente la compra o la recarga, y cobra con ese saldo. */
function GiftCardActions({ card, actions }) {
  const balance = card.giftBalance;
  const [mode, setMode] = useState(balance > 0 ? "charge" : "load");
  const disabled = !actions.hasBranch;
  const quickCharges = [20, 50]
    .filter(value => value < balance)
    .map(value => ({ label: formatSoles(value), value }))
    .concat(balance > 0 ? [{ label: `Todo (${formatSoles(balance)})`, value: balance }] : []);
  const quickLoads = [20, 50, 100].map(value => ({ label: formatSoles(value), value }));

  return (
    <Section title="Gift card">
      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: "charge", label: "Cobrar" },
          { value: "load", label: "Recargar saldo" }
        ]}
      />
      {mode === "load" ? (
        <AmountAction
          key="load"
          label="Monto a recargar"
          buttonLabel="Recargar saldo"
          buttonIcon="add-circle-outline"
          quickAmounts={quickLoads}
          describe={amount => `La gift card quedará con ${formatSoles(roundToCents(balance + amount))}.`}
          confirmTitle="¿Recargar la gift card?"
          confirmMessage={amount => `Se cargarán ${formatSoles(amount)} a la gift card de ${card.customer.fullName}. Cobra ese monto al cliente.`}
          loading={actions.pendingAction === "load"}
          disabled={disabled}
          onSubmit={amount => actions.loadGiftCard(amount)}
        />
      ) : balance <= 0 ? (
        <Notice icon="alert-circle-outline" tone="warning">
          Esta gift card no tiene saldo. Usa «Recargar saldo» cuando el cliente la compre o la recargue.
        </Notice>
      ) : (
        <AmountAction
          key="charge"
          label="Monto a cobrar"
          buttonLabel="Cobrar"
          buttonIcon="card-outline"
          max={balance}
          maxLabel={`La gift card solo tiene ${formatSoles(balance)}.`}
          quickAmounts={quickCharges}
          describe={amount => `Quedarán ${formatSoles(Math.max(0, roundToCents(balance - amount)))} en la gift card.`}
          confirmTitle="¿Cobrar con la gift card?"
          confirmMessage={amount => `Se descontarán ${formatSoles(amount)} de la gift card de ${card.customer.fullName}.`}
          loading={actions.pendingAction === "charge"}
          disabled={disabled}
          onSubmit={amount => actions.chargeBalance(amount, updated => `Cobro registrado. Quedan ${formatSoles(updated.giftBalance)}.`)}
        />
      )}
    </Section>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={styles.sectionMark} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Segmented({ value, onChange, options }) {
  return (
    <View style={styles.segmented} accessibilityRole="tablist">
      {options.map(option => {
        const selected = option.value === value;
        return (
          <Pressable key={option.value} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => onChange(option.value)} style={[styles.segment, selected && styles.segmentSelected]}>
            <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function StepperButton({ icon, label, onPress, disabled }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} disabled={disabled} style={[styles.stepperButton, disabled && styles.stepperDisabled]} hitSlop={6}>
      <Ionicons name={icon} size={22} color={colors.espresso} />
    </Pressable>
  );
}

const NOTICE_TONES = {
  success: { background: colors.successSoft, color: colors.success },
  warning: { background: colors.warningSoft, color: colors.warning },
  danger: { background: colors.dangerSoft, color: colors.danger }
};

function Notice({ icon, tone = "warning", children }) {
  const palette = NOTICE_TONES[tone];
  return (
    <View style={[styles.notice, { backgroundColor: palette.background }]}>
      <Ionicons name={icon} size={20} color={palette.color} />
      <Text style={[styles.noticeText, { color: palette.color }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.lg },
  section: { backgroundColor: colors.paper, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: spacing.lg, gap: spacing.md },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  sectionMark: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.caramel },
  sectionTitle: { ...typography.title, flex: 1 },
  caption: { ...typography.body, color: colors.muted },
  notice: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, borderRadius: radius.md },
  noticeText: { flex: 1, fontSize: 14, fontFamily: fonts.semibold, lineHeight: 19 },
  stepperRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stepperLabel: { ...typography.body, fontFamily: fonts.semibold },
  stepper: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  stepperButton: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: colors.ink, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center" },
  stepperDisabled: { opacity: 0.3 },
  stepperValue: { fontFamily: fonts.displayHeavy, fontSize: 30, lineHeight: 34, minWidth: 34, textAlign: "center", color: colors.ink },
  segmented: { flexDirection: "row", backgroundColor: colors.espresso, borderRadius: radius.md, padding: 4 },
  segment: { flex: 1, minHeight: 44, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  segmentSelected: { backgroundColor: colors.caramel },
  segmentText: { fontSize: 15, fontFamily: fonts.semibold, color: colors.onDarkSoft },
  segmentTextSelected: { color: colors.espresso, fontFamily: fonts.bold },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.white },
  chipSelected: { backgroundColor: colors.caramel, borderColor: colors.caramel },
  chipText: { fontSize: 14, fontFamily: fonts.semibold, color: colors.muted },
  chipTextSelected: { color: colors.espresso, fontFamily: fonts.bold }
});
