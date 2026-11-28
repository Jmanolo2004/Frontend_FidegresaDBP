import { useState } from "react";
import { Keyboard, Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "../AppButton";
import { ConfirmSheet } from "../ConfirmSheet";
import { TextField } from "../TextField";
import { parseAmount, validateAmount } from "../../utils/validation";
import { formatSoles } from "../../utils/formatters";
import { colors, fonts, radius, spacing } from "../../utils/theme";

/**
 * Bloque reutilizable: el cajero ingresa un monto en soles, ve qué pasará y confirma.
 * describe(amount) devuelve el texto de vista previa; confirmMessage(amount) el de la confirmación.
 */
export function AmountAction({ label, buttonLabel, buttonIcon, max, maxLabel, quickAmounts = [], describe, confirmTitle, confirmMessage, loading, disabled, onSubmit }) {
  const [text, setText] = useState("");
  const [error, setError] = useState(null);
  const [confirming, setConfirming] = useState(false);

  const amount = parseAmount(text);
  const preview = Number.isFinite(amount) && amount > 0 && describe ? describe(amount) : null;

  const handleRequest = () => {
    const validationError = validateAmount(text, { max, maxLabel });
    setError(validationError);
    if (validationError) return;
    Keyboard.dismiss();
    setConfirming(true);
  };

  const handleConfirm = async () => {
    const ok = await onSubmit(amount);
    setConfirming(false);
    if (ok) {
      setText("");
      setError(null);
    }
  };

  return (
    <View style={styles.wrapper}>
      <TextField
        label={label}
        prefix="S/"
        value={text}
        onChangeText={value => {
          setText(value);
          if (error) setError(null);
        }}
        keyboardType="decimal-pad"
        placeholder="0.00"
        error={error}
        hint={preview}
        editable={!disabled && !loading}
        returnKeyType="done"
        onSubmitEditing={handleRequest}
      />
      {quickAmounts.length > 0 ? (
        <View style={styles.chips}>
          {quickAmounts.map(quick => (
            <Pressable
              key={quick.label}
              accessibilityRole="button"
              accessibilityLabel={`Usar ${quick.label}`}
              onPress={() => {
                setText(quick.value.toFixed(2));
                setError(null);
              }}
              disabled={disabled || loading}
              style={styles.chip}
            >
              <Text style={styles.chipText}>{quick.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <AppButton label={buttonLabel} icon={buttonIcon} onPress={handleRequest} loading={loading} disabled={disabled} />
      <ConfirmSheet
        visible={confirming}
        title={confirmTitle}
        message={Number.isFinite(amount) ? confirmMessage(amount) : ""}
        confirmLabel={`Confirmar ${Number.isFinite(amount) ? formatSoles(amount) : ""}`}
        loading={loading}
        onConfirm={handleConfirm}
        onCancel={() => setConfirming(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.md },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  chipText: { fontFamily: fonts.bold, fontSize: 14, color: colors.coffee }
});
