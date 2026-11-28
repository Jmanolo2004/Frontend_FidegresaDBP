import { StyleSheet, Text, View } from "react-native";
import { fonts } from "../../utils/theme";

const DEFAULT_LEVEL_COUNT = 5;

/** Barras que suben sobre la franja del pase; la del nivel actual toma el color de la tarjeta con borde blanco. */
export function LevelBars({ levels, currentLevel, background, ink }) {
  const count = levels?.length ? levels.length : DEFAULT_LEVEL_COUNT;
  const bars = Array.from({ length: count }, (_, index) => index + 1);

  return (
    <View style={styles.row} accessibilityLabel={`Nivel ${currentLevel} de ${count}`}>
      {bars.map(level => {
        const isCurrent = level === currentLevel;
        const reached = level < currentLevel;
        return (
          <View
            key={level}
            style={[
              styles.bar,
              { height: `${34 + (level / count) * 54}%` },
              isCurrent ? [styles.current, { backgroundColor: background }] : reached ? styles.reached : styles.pending
            ]}
          >
            <Text style={[styles.number, isCurrent && { color: ink }]}>{level}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { ...StyleSheet.absoluteFillObject, flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: 10, paddingHorizontal: "9%" },
  bar: { flex: 1, maxWidth: 52, borderTopLeftRadius: 10, borderTopRightRadius: 10, alignItems: "center", paddingTop: 10 },
  current: { borderWidth: 2, borderBottomWidth: 0, borderColor: "rgba(255,255,255,0.85)" },
  reached: { backgroundColor: "rgba(255,255,255,0.28)" },
  pending: { backgroundColor: "rgba(18,14,20,0.48)" },
  number: { color: "#ffffff", fontFamily: fonts.displayHeavy, fontSize: 17 }
});
