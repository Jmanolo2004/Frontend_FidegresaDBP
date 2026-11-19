import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PROGRAM_TYPES } from "../../services/cardService";
import { formatSoles } from "../../utils/formatters";
import { colors, programColors, radius, spacing } from "../../utils/theme";
import { StampGrid } from "./StampGrid";
import { LevelBars } from "./LevelBars";

const TYPE_META = {
  STAMPS: { label: "Estampillas", icon: "ribbon-outline" },
  CASHBACK: { label: "Cashback", icon: "cash-outline" },
  LEVELS: { label: "Niveles", icon: "podium-outline" },
  GIFT_CARD: { label: "Gift card", icon: "gift-outline" }
};

const STATUS_LABELS = { BLOCKED: "Bloqueada", INACTIVE: "Inactiva" };

/** Vista de la tarjeta como la ve el cliente en su wallet (sin el QR). */
export function LoyaltyCardView({ card, color = null, branchName = "" }) {
  const meta = TYPE_META[card.type] ?? TYPE_META.STAMPS;
  // Color del programa (el mismo de la tarjeta creada en el panel); si no llega, el color de su tipo.
  const background = color ?? programColors[card.type] ?? colors.coffee;
  const statusLabel = STATUS_LABELS[card.status];

  return (
    <View style={[styles.card, { backgroundColor: background }]} accessibilityLabel={`Tarjeta de ${meta.label} de ${card.customer.fullName}`}>
      <View style={styles.header}>
        <View style={styles.logo}>
          <Ionicons name={meta.icon} size={20} color={background} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.business} numberOfLines={1}>
            {branchName || card.program.businessName || card.program.name}
          </Text>
          <Text style={styles.program} numberOfLines={1}>
            {meta.label} · {card.program.name}
          </Text>
        </View>
        {statusLabel ? (
          <View style={styles.statusPill}>
            <Text style={styles.statusText}>{statusLabel}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>{renderBody(card, background)}</View>

      <View style={styles.footer}>
        <View style={styles.footerBlock}>
          <Text style={styles.footerLabel}>Nombre del cliente</Text>
          <Text style={styles.footerValue} numberOfLines={1}>
            {card.customer.fullName}
          </Text>
        </View>
        <View style={[styles.footerBlock, styles.alignEnd]}>
          <Text style={styles.footerLabel}>Tarjeta</Text>
          <Text style={styles.footerValue}>{card.serialNumber || card.qrToken}</Text>
        </View>
      </View>
    </View>
  );
}

function renderBody(card, background) {
  switch (card.type) {
    case PROGRAM_TYPES.CASHBACK:
      return (
        <View style={styles.figureRow}>
          <Figure label="Saldo" value={formatSoles(card.cashbackBalance)} large />
          <Figure label="Cashback" value={`${card.program.cashbackPercent}%`} alignEnd />
        </View>
      );
    case PROGRAM_TYPES.LEVELS:
      return (
        <View style={styles.levelsBody}>
          <LevelBars levels={card.program.levels} currentLevel={card.level} />
          <View style={styles.figureRow}>
            <Figure label="Nivel registrado" value={levelName(card)} />
            <Figure label="Puntos" value={String(card.points)} alignEnd />
          </View>
        </View>
      );
    case PROGRAM_TYPES.GIFT_CARD:
      return (
        <View style={styles.figureRow}>
          <Figure label="Saldo disponible" value={formatSoles(card.giftBalance)} large />
          {card.giftInitialAmount ? <Figure label="Monto inicial" value={formatSoles(card.giftInitialAmount)} alignEnd /> : null}
        </View>
      );
    default:
      return (
        <View style={styles.levelsBody}>
          <StampGrid total={card.program.requiredStamps} filled={card.stampBalance} color={background} />
          <View style={styles.figureRow}>
            <Figure label="Estampillas totales" value={String(card.program.requiredStamps)} />
            <Figure label="Estampillas completadas" value={String(Math.min(card.stampBalance, card.program.requiredStamps))} alignEnd />
          </View>
        </View>
      );
  }
}

function levelName(card) {
  const current = card.program.levels.find(level => level.number === card.level);
  return current?.name || `Nivel ${card.level}`;
}

function Figure({ label, value, large = false, alignEnd = false }) {
  return (
    <View style={alignEnd ? styles.alignEnd : null}>
      <Text style={styles.figureLabel}>{label}</Text>
      <Text style={[styles.figureValue, large && styles.figureLarge]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: spacing.lg, gap: spacing.lg, elevation: 4, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  logo: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1 },
  business: { color: colors.white, fontSize: 17, fontWeight: "800" },
  program: { color: "rgba(255,255,255,0.82)", fontSize: 13, marginTop: 2 },
  statusPill: { backgroundColor: colors.white, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  statusText: { color: colors.danger, fontSize: 12, fontWeight: "800" },
  body: { gap: spacing.md },
  levelsBody: { gap: spacing.lg },
  figureRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", gap: spacing.md },
  figureLabel: { color: "rgba(255,255,255,0.8)", fontSize: 10, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase" },
  figureValue: { color: colors.white, fontSize: 20, fontWeight: "800", marginTop: 3 },
  figureLarge: { fontSize: 30 },
  footer: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.22)", paddingTop: spacing.md },
  footerBlock: { flexShrink: 1 },
  footerLabel: { color: "rgba(255,255,255,0.75)", fontSize: 10, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase" },
  footerValue: { color: colors.white, fontSize: 15, fontWeight: "700", marginTop: 2 },
  alignEnd: { alignItems: "flex-end" }
});
