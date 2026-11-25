import { forwardRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius, spacing, typography } from "../utils/theme";

/** Campo de texto con etiqueta, ayuda y error; opción de mostrar u ocultar la contraseña. */
export const TextField = forwardRef(function TextField({ label, error, hint, prefix, secure = false, style, ...inputProps }, ref) {
  const [hidden, setHidden] = useState(secure);
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrapper, style]}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, focused && styles.inputFocused, error && styles.inputError]}>
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          {...inputProps}
          ref={ref}
          accessibilityLabel={label}
          placeholderTextColor="#a08f80"
          style={styles.input}
          secureTextEntry={hidden}
          onFocus={event => {
            setFocused(true);
            inputProps.onFocus?.(event);
          }}
          onBlur={event => {
            setFocused(false);
            inputProps.onBlur?.(event);
          }}
        />
        {secure ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Mostrar contraseña" : "Ocultar contraseña"}
            onPress={() => setHidden(value => !value)}
            hitSlop={12}
            style={styles.eye}
          >
            <Ionicons name={hidden ? "eye-outline" : "eye-off-outline"} size={20} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { ...typography.label, color: colors.muted },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.paper,
    paddingHorizontal: spacing.md
  },
  inputFocused: { borderColor: colors.caramel, borderWidth: 2, backgroundColor: colors.white },
  inputError: { borderColor: colors.danger },
  prefix: { fontSize: 17, fontFamily: fonts.semibold, color: colors.muted, marginRight: 6 },
  input: { flex: 1, fontSize: 17, fontFamily: fonts.medium, color: colors.ink, paddingVertical: 10 },
  eye: { padding: 4 },
  error: { fontSize: 13, color: colors.danger, fontFamily: fonts.semibold },
  hint: { fontSize: 13, color: colors.muted, fontFamily: fonts.regular, lineHeight: 18 }
});
