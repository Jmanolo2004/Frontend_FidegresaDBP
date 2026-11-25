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
import { initials } from "../utils/formatters";
import { colors, fonts, radius, spacing, typography } from "../utils/theme";

const SOURCE_LABELS = { gps: "Detectado por GPS", manual: "Elegido a mano", saved: "Último local usado" };

export function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { selectedBranch, selectionSource, branches } = useBranch();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Mi cuenta</Text>
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials((user?.email ?? "?").split("@")[0].replace(/[._-]+/g, " "))}</Text>
          </View>
          <View style={styles.identityText}>
            <Text style={styles.identityLabel}>Sesión iniciada como</Text>
            <Text style={styles.email} numberOfLines={1}>
              {user?.email ?? "—"}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.sheet} contentContainerStyle={styles.content}>
        <View style={styles.branchCard}>
          <View style={styles.branchTop}>
            <View style={styles.branchIcon}>
              <Ionicons name="storefront" size={22} color={colors.espresso} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Local actual</Text>
              <Text style={styles.branchName}>{selectedBranch?.name ?? "Sin elegir"}</Text>
              <Text style={styles.rowDetail}>{selectedBranch ? SOURCE_LABELS[selectionSource] : `${branches.length} locales disponibles`}</Text>
            </View>
          </View>
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
  const tint = danger ? colors.danger : colors.espresso;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.option, pressed && { opacity: 0.7 }]}>
      <View style={[styles.optionIcon, danger && { backgroundColor: colors.dangerSoft }]}>
        <Ionicons name={icon} size={20} color={tint} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.optionLabel, danger && { color: colors.danger }]}>{label}</Text>
        {detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}
      </View>
      {danger ? null : <Ionicons name="chevron-forward" size={20} color={colors.muted} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.espresso },
  hero: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xl, gap: spacing.lg },
  eyebrow: { ...typography.label, color: colors.caramel },
  identity: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.kraft, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: fonts.displayHeavy, fontSize: 24, color: colors.espresso },
  identityText: { flex: 1, minWidth: 0 },
  identityLabel: { ...typography.caption, color: colors.onDarkSoft },
  email: { fontFamily: fonts.display, fontSize: 21, lineHeight: 26, color: colors.onDark, marginTop: 2 },
  sheet: { flex: 1, backgroundColor: colors.cream, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  content: { padding: spacing.lg, paddingTop: spacing.xl, gap: spacing.lg },
  branchCard: { backgroundColor: colors.kraft, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.lg },
  branchTop: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  branchIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1 },
  rowLabel: { ...typography.label, color: colors.espresso, opacity: 0.75 },
  branchName: { fontFamily: fonts.display, fontSize: 22, lineHeight: 27, color: colors.espresso, marginTop: 2 },
  rowDetail: { ...typography.caption, color: colors.espresso, opacity: 0.8, marginTop: 2 },
  options: { backgroundColor: colors.paper, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, paddingHorizontal: spacing.lg },
  option: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.lg },
  optionIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.kraftSoft, alignItems: "center", justifyContent: "center" },
  optionLabel: { fontSize: 16, fontFamily: fonts.semibold, color: colors.ink },
  optionDivider: { height: 1, backgroundColor: colors.line },
  version: { ...typography.caption, textAlign: "center" }
});
