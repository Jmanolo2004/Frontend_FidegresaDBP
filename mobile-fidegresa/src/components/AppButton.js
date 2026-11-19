import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "../utils/theme";

const VARIANTS = {
  primary: { background: colors.espresso, text: colors.cream, border: colors.espresso },
  accent: { background: colors.caramel, text: colors.espresso, border: colors.caramel },
  secondary: { background: colors.paper, text: colors.espresso, border: colors.line },
  danger: { background: colors.dangerSoft, text: colors.danger, border: colors.dangerSoft },
  ghost: { background: "transparent", text: colors.espresso, border: "transparent" }
};

/** Botón con estado de carga: mientras carga no se puede volver a tocar (evita doble envío). */
export function AppButton({ label, onPress, variant = "primary", icon, loading = false, disabled = false, style, accessibilityHint }) {
  const palette = VARIANTS[variant] ?? VARIANTS.primary;
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.background, borderColor: palette.border, opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1 },
        style
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={palette.text} />
        ) : (
          icon && <Ionicons name={icon} size={19} color={palette.text} />
        )}
        <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 50, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.lg, justifyContent: "center" },
  content: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  label: { fontSize: 16, fontWeight: "700" }
});
