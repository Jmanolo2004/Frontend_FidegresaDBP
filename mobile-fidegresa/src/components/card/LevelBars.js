import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../utils/theme";

const DEFAULT_LEVEL_COUNT = 5;

/** Barras escalonadas 1…N; la del nivel actual va resaltada. */
export function LevelBars({ levels, currentLevel }) {
  const count = levels?.length ? levels.length : DEFAULT_LEVEL_COUNT;
  const bars = Array.from({ length: count }, (_, index) => index + 1);

  return (
    <View style={styles.row} accessibilityLabel={`Nivel ${currentLevel} de ${count}`}>
      {bars.map(level => {
        const isCurrent = level === currentLevel;
        const reached = level < currentLevel;
        return (
          <View key={level} style={[styles.bar, { height: 26 + (level / count) * 54 }, isCurrent ? styles.current : reached ? styles.reached : styles.pending]}>
            <Text style={[styles.number, isCurrent && styles.numberCurrent]}>{level}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", gap: 8, height: 84 },
  bar: { flex: 1, borderTopLeftRadius: 8, borderTopRightRadius: 8, alignItems: "center", justifyContent: "flex-start", paddingTop: 6 },
  current: { backgroundColor: colors.white },
  reached: { backgroundColor: "rgba(255,255,255,0.45)" },
  pending: { backgroundColor: "rgba(0,0,0,0.22)" },
  number: { color: colors.white, fontWeight: "800", fontSize: 14 },
  numberCurrent: { color: colors.ink }
});
