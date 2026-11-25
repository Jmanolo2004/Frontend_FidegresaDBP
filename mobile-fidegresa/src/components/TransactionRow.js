import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { isCreditTransaction } from "../services/transactionService";
import { formatRelative, formatSoles, formatTime } from "../utils/formatters";
import { colors, fonts, programColors, spacing } from "../utils/theme";

/** Ícono de cada tipo de tarjeta, el mismo que se ve en la pantalla Escanear. */
const TYPE_ICONS = { STAMPS: "star", CASHBACK: "cash", LEVELS: "trophy", GIFT_CARD: "gift" };

function formatAmount(transaction) {
  if (transaction.unit === "STAMPS") return `${transaction.amount} ${transaction.amount === 1 ? "sello" : "sellos"}`;
  if (transaction.unit === "POINTS") return `${transaction.amount} pts`;
  return formatSoles(transaction.amount);
}

/**
 * Fila de movimiento: qué pasó, a quién y cuándo. El local solo se muestra si es distinto de `currentBranchName`
 * (por ejemplo, en "Todos los locales"), para no repetirlo en cada fila.
 */
export function TransactionRow({ transaction, showCustomer = true, currentBranchName = null, onVoid, voiding = false, timeOnly = false }) {
  const credit = isCreditTransaction(transaction.type);
  const accent = programColors[transaction.programType] ?? colors.coffee;
  const icon = TYPE_ICONS[transaction.programType] ?? "card";
  const branch = transaction.branchName && transaction.branchName !== currentBranchName ? transaction.branchName : null;
  const subtitle = [showCustomer ? transaction.customerName : null, branch, timeOnly ? null : formatRelative(transaction.createdAt)].filter(Boolean).join(" · ");

  return (
    <View style={styles.row}>
      <View style={[styles.icon, { backgroundColor: accent }]}>
        <Ionicons name={icon} size={18} color={colors.white} />
        <View style={[styles.badge, { backgroundColor: credit ? colors.success : colors.ink }]}>
          <Ionicons name={credit ? "arrow-up" : "arrow-down"} size={10} color={colors.white} />
        </View>
      </View>
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {transaction.label}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.amount, { color: credit ? colors.success : colors.ink }]}>
          {credit ? "+" : "−"}
          {formatAmount(transaction)}
        </Text>
        {timeOnly ? <Text style={styles.time}>{formatTime(transaction.createdAt)}</Text> : null}
        {transaction.canBeVoided && onVoid ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`Anular ${transaction.label}`} onPress={() => onVoid(transaction)} disabled={voiding} hitSlop={8}>
            <Text style={[styles.void, voiding && { opacity: 0.5 }]}>{voiding ? "Anulando…" : "Anular"}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: 14 },
  icon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  badge: { position: "absolute", right: -4, bottom: -4, width: 19, height: 19, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.paper },
  text: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, fontFamily: fonts.semibold, color: colors.ink },
  subtitle: { fontSize: 13, fontFamily: fonts.regular, color: colors.muted, marginTop: 2 },
  right: { alignItems: "flex-end", gap: 4 },
  amount: { fontSize: 17, fontFamily: fonts.display },
  time: { fontSize: 12, fontFamily: fonts.medium, color: colors.muted },
  void: { fontSize: 13, fontFamily: fonts.bold, color: colors.danger }
});
