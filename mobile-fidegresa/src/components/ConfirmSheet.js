import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "./AppButton";
import { colors, radius, spacing, typography } from "../utils/theme";

/** Confirmación antes de registrar un movimiento que cambia el saldo del cliente. */
export function ConfirmSheet({ visible, title, message, confirmLabel = "Confirmar", confirmVariant = "primary", loading = false, onConfirm, onCancel }) {
  // Mientras se cierra, conserva el texto con el que se abrió (evita que cambie durante la animación).
  const [shown, setShown] = useState({ title, message, confirmLabel, confirmVariant });
  if (visible && (shown.title !== title || shown.message !== message || shown.confirmLabel !== confirmLabel || shown.confirmVariant !== confirmVariant)) {
    setShown({ title, message, confirmLabel, confirmVariant });
  }
  const content = visible ? { title, message, confirmLabel, confirmVariant } : shown;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={loading ? undefined : onCancel}>
      <Pressable style={styles.backdrop} onPress={loading ? undefined : onCancel} accessibilityLabel="Cerrar">
        <Pressable style={styles.sheet} onPress={() => {}} accessibilityViewIsModal>
          <Text style={styles.title}>{content.title}</Text>
          {content.message ? <Text style={styles.message}>{content.message}</Text> : null}
          <View style={styles.actions}>
            <AppButton label="Cancelar" variant="secondary" onPress={onCancel} disabled={loading} style={styles.button} />
            <AppButton label={content.confirmLabel} variant={content.confirmVariant} onPress={onConfirm} loading={loading} style={styles.button} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.paper, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxl },
  title: typography.title,
  message: { ...typography.body, color: colors.muted, lineHeight: 22 },
  actions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
  button: { flex: 1 }
});
