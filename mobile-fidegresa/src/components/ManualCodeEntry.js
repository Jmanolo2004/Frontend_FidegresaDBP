import { useState } from "react";
import { Keyboard, StyleSheet, View } from "react-native";
import { AppButton } from "./AppButton";
import { TextField } from "./TextField";
import { extractCardToken } from "../utils/qrPayload";
import { spacing } from "../utils/theme";

/** Respaldo cuando no hay cámara: el cajero escribe el código impreso bajo el QR. */
export function ManualCodeEntry({ onSubmit, compact = false }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState(null);

  const handleSubmit = () => {
    const token = extractCardToken(code);
    if (!token) {
      setError("Escribe el código que aparece debajo del QR (por ejemplo FDG-EST-4821).");
      return;
    }
    Keyboard.dismiss();
    setError(null);
    setCode("");
    onSubmit(token);
  };

  return (
    <View style={[styles.wrapper, compact && styles.compact]}>
      <TextField
        label="Código de la tarjeta"
        value={code}
        onChangeText={value => {
          setCode(value.toUpperCase());
          if (error) setError(null);
        }}
        placeholder="FDG-EST-4821"
        autoCapitalize="characters"
        autoCorrect={false}
        returnKeyType="search"
        onSubmitEditing={handleSubmit}
        error={error}
      />
      <AppButton label="Buscar tarjeta" icon="search" variant="accent" onPress={handleSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.md, alignSelf: "stretch" },
  compact: { gap: spacing.sm }
});
