import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, programColors } from "../../utils/theme";

/** Círculos de sellos: completados en blanco con ícono, pendientes translúcidos. */
export function StampGrid({ total, filled, color = programColors.STAMPS }) {
  const safeTotal = Math.max(1, Math.min(total || 10, 20));
  const columns = safeTotal <= 8 ? 4 : safeTotal <= 12 ? 6 : 5;
  const cells = Array.from({ length: safeTotal }, (_, index) => index < filled);

  return (
    <View style={styles.grid} accessibilityLabel={`${Math.min(filled, safeTotal)} de ${safeTotal} sellos`}>
      {cells.map((isFilled, index) => (
        <View key={index} style={[styles.cell, { width: `${100 / columns}%` }]}>
          <View style={[styles.stamp, isFilled ? styles.filled : styles.empty]}>
            <Ionicons name={index === safeTotal - 1 ? "gift" : "star"} size={18} color={isFilled ? color : "rgba(255,255,255,0.7)"} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", rowGap: 10 },
  cell: { alignItems: "center" },
  stamp: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  filled: { backgroundColor: colors.white },
  empty: { borderWidth: 1.5, borderStyle: "dashed", borderColor: "rgba(255,255,255,0.6)" }
});
