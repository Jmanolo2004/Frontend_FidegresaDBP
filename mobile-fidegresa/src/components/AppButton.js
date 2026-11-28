import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius, spacing } from "../utils/theme";

/** Botones en píldora de la landing: oscuro, caramelo, con borde de tinta y sus versiones para fondos oscuros. */
const VARIANTS = {
  primary: { background: colors.espresso, text: colors.onDark, border: colors.espresso },
  accent: { background: colors.caramel, text: colors.espresso, border: colors.caramel },
  secondary: { background: "transparent", text: colors.ink, border: colors.ink },
  danger: { background: colors.danger, text: colors.white, border: colors.danger },
  ghost: { background: "transparent", text: colors.espresso, border: "transparent" },
  light: { background: colors.onDark, text: colors.espresso, border: colors.onDark },
  outlineLight: { background: "transparent", text: colors.onDark, border: "#8c7362" },
  wallet: { background: "#000000", text: colors.white, border: "#000000" }
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
        { backgroundColor: palette.background, borderColor: palette.border, opacity: isDisabled ? 0.45 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
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
  button: { minHeight: 52, borderRadius: radius.pill, borderWidth: 2, paddingHorizontal: spacing.xl, justifyContent: "center" },
  content: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  label: { fontSize: 16, fontFamily: fonts.semibold }
});
