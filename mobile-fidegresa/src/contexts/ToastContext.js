import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "../utils/theme";

export const ToastContext = createContext(null);

const VARIANTS = {
  success: { icon: "checkmark-circle", background: colors.success },
  error: { icon: "alert-circle", background: colors.danger },
  info: { icon: "information-circle", background: colors.espresso }
};

/** Avisos breves arriba de la pantalla para confirmar acciones o explicar errores. */
export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const [opacity] = useState(() => new Animated.Value(0));
  const hideTimer = useRef(null);
  const insets = useSafeAreaInsets();

  const hide = useCallback(() => {
    Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => setToast(null));
  }, [opacity]);

  const show = useCallback(
    (message, variant = "info") => {
      clearTimeout(hideTimer.current);
      setToast({ message, variant, id: Date.now() });
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      hideTimer.current = setTimeout(hide, variant === "error" ? 4200 : 2800);
    },
    [hide, opacity]
  );

  useEffect(() => () => clearTimeout(hideTimer.current), []);

  const value = useMemo(
    () => ({
      show,
      success: message => show(message, "success"),
      error: message => show(message, "error"),
      info: message => show(message, "info")
    }),
    [show]
  );

  const variant = toast ? VARIANTS[toast.variant] ?? VARIANTS.info : null;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={[styles.toast, { top: insets.top + spacing.sm, opacity, backgroundColor: variant.background }]}
        >
          <Ionicons name={variant.icon} size={20} color={colors.white} />
          <View style={styles.textWrap}>
            <Text style={styles.text}>{toast.message}</Text>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }
  },
  textWrap: { flex: 1 },
  text: { color: colors.white, fontSize: 14, fontWeight: "600", lineHeight: 19 }
});
