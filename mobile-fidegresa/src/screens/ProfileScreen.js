import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AppButton } from "../components/AppButton";
import { BranchPicker } from "../components/BranchPicker";
import { ConfirmSheet } from "../components/ConfirmSheet";
import { useAuth } from "../hooks/useAuth";
import { useBranch } from "../hooks/useBranch";
import { colors, radius, spacing, typography } from "../utils/theme";

const SOURCE_LABELS = { gps: "Detectado por GPS", manual: "Elegido a mano", saved: "Último local usado" };

export function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { selectedBranch, selectionSource, branches } = useBranch();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Mi cuenta</Text>

        <View style={styles.card}>
          <Row icon="person-circle-outline" label="Sesión iniciada como" value={user?.email ?? "—"} />
        </View>

        <View style={styles.card}>
          <Row icon="storefront-outline" label="Local actual" value={selectedBranch?.name ?? "Sin elegir"} detail={selectedBranch ? SOURCE_LABELS[selectionSource] : `${branches.length} locales disponibles`} />
          <AppButton label="Cambiar local" icon="swap-horizontal" variant="secondary" onPress={() => setPickerOpen(true)} />
        </View>

        <View style={styles.options}>
          <Option icon="book-outline" label="Manual de uso" detail="Cómo escanear, sumar y canjear" onPress={() => router.push("/manual")} />
          <View style={styles.optionDivider} />
          <Option icon="log-out-outline" label="Cerrar sesión" danger onPress={() => setConfirmLogout(true)} />
        </View>
        <Text style={styles.version}>Fidegresa Caja · v1.0.0</Text>
      </ScrollView>

      <BranchPicker visible={pickerOpen} onClose={() => setPickerOpen(false)} />
      <ConfirmSheet
        visible={confirmLogout}
        title="¿Cerrar sesión?"
        message="Tendrás que ingresar tu correo y contraseña para volver a escanear tarjetas."
        confirmLabel="Cerrar sesión"
        confirmVariant="danger"
        loading={signingOut}
        onConfirm={async () => {
          setSigningOut(true);
          await signOut();
        }}
        onCancel={() => setConfirmLogout(false)}
      />
    </SafeAreaView>
  );
}

function Option({ icon, label, detail, danger = false, onPress }) {
  const tint = danger ? colors.danger : colors.coffee;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.option, pressed && { opacity: 0.7 }]}>
      <Ionicons name={icon} size={22} color={tint} />
      <View style={styles.rowText}>
        <Text style={[styles.optionLabel, danger && { color: colors.danger }]}>{label}</Text>
        {detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}
      </View>
      {danger ? null : <Ionicons name="chevron-forward" size={20} color={colors.muted} />}
    </Pressable>
  );
}

function Row({ icon, label, value, detail }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={22} color={colors.coffee} />
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
        {detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing.lg, gap: spacing.lg },
  title: typography.display,
  card: { backgroundColor: colors.paper, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: spacing.lg, gap: spacing.lg },
  row: { flexDirection: "row", gap: spacing.md },
  rowText: { flex: 1 },
  rowLabel: typography.label,
  rowValue: { fontSize: 16, fontWeight: "700", color: colors.ink, marginTop: 3 },
  rowDetail: { ...typography.caption, marginTop: 2 },
  options: { backgroundColor: colors.paper, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, paddingHorizontal: spacing.lg },
  option: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.lg },
  optionLabel: { fontSize: 16, fontWeight: "700", color: colors.ink },
  optionDivider: { height: 1, backgroundColor: colors.line },
  version: { ...typography.caption, textAlign: "center" }
});
