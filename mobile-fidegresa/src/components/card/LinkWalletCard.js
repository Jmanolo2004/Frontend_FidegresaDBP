import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useAsync } from "../../hooks/useAsync";
import { Ionicons } from "@expo/vector-icons";
import { AppButton } from "../AppButton";
import { TextField } from "../TextField";
import { useBranch } from "../../hooks/useBranch";
import { cardTypeFromToken, getLinkablePrograms, linkWalletCard } from "../../services/walletLinks";
import { colors, programColors, radius, spacing, typography } from "../../utils/theme";

const ICONS = { STAMPS: "star", CASHBACK: "cash", LEVELS: "trophy", GIFT_CARD: "gift" };

/** Tarjeta de Google Wallet que aún no existe en el backend: se registra en un toque y se abre. */
export function LinkWalletCard({ walletToken, onLinked, onCancel }) {
  const type = cardTypeFromToken(walletToken);
  const { selectedBranch } = useBranch();
  const [name, setName] = useState("Cliente de prueba");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const programs = useAsync(() => getLinkablePrograms(walletToken, selectedBranch?.id), `${walletToken}-${selectedBranch?.id ?? "all"}`);
  const [chosenId, setChosenId] = useState(null);
  const chosen = (programs.data ?? []).find(item => item.id === chosenId) ?? (programs.data ?? [])[0] ?? null;
  // El color es el del programa elegido: el mismo del pase de Google Wallet.
  const color = chosen?.color ?? programColors[type?.programType] ?? colors.coffee;
  const code = String(walletToken).toUpperCase().replace(/^FDG-/, "");

  const submit = async () => {
    if (name.trim().length < 2) {
      setError("Escribe el nombre del cliente que aparece en la tarjeta.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      onLinked(await linkWalletCard({ walletToken, customerName: name.trim(), program: chosen }));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={[styles.card, { backgroundColor: color }]}>
        <View style={styles.cardIcon}>
          <Ionicons name={ICONS[type?.programType] ?? "card"} size={24} color={color} />
        </View>
        <Text style={styles.cardType}>{type?.label ?? "Tarjeta"}</Text>
        {chosen ? <Text style={styles.cardProgram}>{chosen.name}</Text> : null}
        <Text style={styles.cardCode}>{code}</Text>
      </View>

      <View style={styles.box}>
        <Text style={styles.title}>Tarjeta nueva de Google Wallet</Text>
        <Text style={styles.text}>
          Reconocimos una tarjeta de {type?.label.toLowerCase() ?? "fidelización"}, pero todavía no está registrada en tu negocio. Elige el programa que aparece en el pase y regístrala: empieza en cero.
        </Text>
        <Text style={styles.label}>Programa del pase</Text>
        {programs.loading ? (
          <ActivityIndicator color={colors.caramel} />
        ) : (programs.data ?? []).length === 0 ? (
          <Text style={styles.text}>No hay programas activos de {type?.label.toLowerCase()}. Actívalo en el panel.</Text>
        ) : (
          (programs.data ?? []).map(program => {
            const selected = chosen?.id === program.id;
            return (
              <Pressable
                key={program.id}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => setChosenId(program.id)}
                style={[styles.option, selected && styles.optionSelected]}
              >
                <View style={[styles.swatch, { backgroundColor: program.color ?? color }]} />
                <View style={styles.optionText}>
                  <Text style={styles.optionName}>{program.name}</Text>
                  <Text style={styles.optionBranch}>{program.branchName}</Text>
                </View>
                <Ionicons name={selected ? "radio-button-on" : "radio-button-off"} size={22} color={selected ? colors.espresso : colors.muted} />
              </Pressable>
            );
          })
        )}
        <TextField label="Nombre del cliente" value={name} onChangeText={setName} autoCapitalize="words" error={error} />
        <AppButton label="Registrar y abrir tarjeta" icon="checkmark-circle-outline" variant="accent" onPress={submit} loading={saving} disabled={!chosen} />
        <AppButton label="Escanear otra tarjeta" icon="scan-outline" variant="ghost" onPress={onCancel} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { padding: spacing.lg, gap: spacing.lg },
  card: { borderRadius: radius.lg, padding: spacing.xl, alignItems: "center", gap: spacing.sm },
  cardIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  cardType: { color: colors.white, fontSize: 22, fontWeight: "800" },
  cardProgram: { color: colors.white, fontSize: 16, fontWeight: "700" },
  label: { ...typography.label },
  option: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  optionSelected: { borderColor: colors.espresso, borderWidth: 2 },
  swatch: { width: 28, height: 28, borderRadius: 14 },
  optionText: { flex: 1 },
  optionName: { ...typography.subtitle },
  optionBranch: { ...typography.caption },
  cardCode: { color: "rgba(255,255,255,0.9)", fontSize: 15, fontWeight: "700", letterSpacing: 1 },
  box: { backgroundColor: colors.paper, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: spacing.lg, gap: spacing.md },
  title: { ...typography.title },
  text: { ...typography.body, color: colors.muted }
});
