import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../utils/theme";

/** Ícono del sello que eligió el dueño en el panel (star, reward o card). */
const STAMP_ICONS = { star: "star", reward: "gift", card: "card" };

/**
 * Sellos sobre la franja del pase, como en Google Wallet: círculos blancos; los ganados llevan un aro y el ícono en el
 * color de acento. El tamaño se ajusta al ancho de la tarjeta.
 */
export function StampGrid({ total, filled, accent = colors.caramel, icon = "star" }) {
  const [width, setWidth] = useState(0);
  const safeTotal = Math.max(1, Math.min(total || 10, 20));
  const earned = Math.max(0, Math.min(filled || 0, safeTotal));
  const columns = safeTotal <= 5 ? safeTotal : safeTotal <= 10 ? 5 : Math.ceil(safeTotal / 2);
  const rows = Math.ceil(safeTotal / columns);
  const cell = width ? (width - 28) / columns : 0;
  const size = Math.max(22, Math.min(cell * 0.8, rows > 1 ? 46 : 54));
  const iconName = STAMP_ICONS[icon] ?? "star";

  return (
    <View style={styles.grid} onLayout={event => setWidth(event.nativeEvent.layout.width)} accessibilityLabel={`${earned} de ${safeTotal} sellos`}>
      {width
        ? Array.from({ length: safeTotal }, (_, index) => {
            const isFilled = index < earned;
            const last = index === safeTotal - 1;
            return (
              <View key={index} style={[styles.cell, { width: cell }]}>
                <View
                  style={[
                    styles.stamp,
                    { width: size, height: size, borderRadius: size / 2 },
                    isFilled && { borderWidth: Math.max(2, size * 0.07), borderColor: accent }
                  ]}
                >
                  <Ionicons name={last ? "gift" : iconName} size={size * 0.46} color={isFilled ? accent : "#a7a7ad"} />
                </View>
              </View>
            );
          })
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", rowGap: 10, paddingHorizontal: 14 },
  cell: { alignItems: "center" },
  stamp: {
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 }
  }
});
