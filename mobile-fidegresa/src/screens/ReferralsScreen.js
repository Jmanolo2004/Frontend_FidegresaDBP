import { Linking, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import QRCode from "react-native-qrcode-svg";
import { Ionicons } from "@expo/vector-icons";
import { AppButton } from "../components/AppButton";
import { ErrorView, LoadingView } from "../components/StateViews";
import { useAsync } from "../hooks/useAsync";
import { getBusinessReferrals, referralMessage } from "../services/referralService";
import { formatDateTime } from "../utils/formatters";
import { colors, fonts, radius, spacing, typography } from "../utils/theme";

/**
 * Programa de referidos ("Recomienda Fidegresa"): el enlace del negocio para invitar a otros dueños. Cuando el invitado
 * se registra con él, aparece aquí; cuando crea su primera tarjeta, cuenta como negocio sumado.
 */
export function ReferralsScreen() {
  const referrals = useAsync(({ signal }) => getBusinessReferrals({ signal }), "business-referrals");
  const data = referrals.data;

  if (referrals.loading && !data) return <LoadingView message="Cargando tu programa de referidos…" />;
  if (referrals.error && !data) {
    return <ErrorView title="No pudimos cargar tus referidos" error={referrals.error} onRetry={referrals.reload} />;
  }
  if (!data) return null;

  const message = referralMessage(data.link, data.code);
  const share = () => Share.share({ message }).catch(() => {});
  const whatsapp = () => Linking.openURL(`https://wa.me/?text=${encodeURIComponent(message)}`).catch(share);

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={referrals.loading} onRefresh={referrals.reload} tintColor={colors.caramel} colors={[colors.caramel]} />}
    >
      <Stack.Screen options={{ title: "Programa de referidos" }} />

      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Recomienda Fidegresa</Text>
        <Text style={styles.heroTitle}>Invita a otro negocio a fidelizar a sus clientes.</Text>
        <Text style={styles.heroText}>
          Comparte tu enlace con dueños de cafeterías, barberías o tiendas. Así conocen Fidegresa, siguen a sus clientes y premian a los más fieles.
        </Text>
      </View>

      <View style={styles.codeCard}>
        {data.link ? (
          <View style={styles.qr} accessibilityLabel="Código QR de tu enlace de invitación">
            <QRCode value={data.link} size={180} color={colors.espresso} backgroundColor={colors.white} ecl="M" />
          </View>
        ) : null}
        <Text style={styles.codeLabel}>Tu código</Text>
        <Text style={styles.code} selectable>
          {data.code || "—"}
        </Text>
        {data.link ? (
          <Text style={styles.link} selectable numberOfLines={2}>
            {data.link}
          </Text>
        ) : (
          <Text style={styles.link}>El enlace aún no está configurado en el servidor; comparte el código para que lo escriban al registrarse.</Text>
        )}
        <View style={styles.actions}>
          <AppButton label="Enviar por WhatsApp" icon="logo-whatsapp" variant="accent" onPress={whatsapp} />
          <AppButton label="Compartir" icon="share-outline" variant="secondary" onPress={share} />
        </View>
      </View>

      <View style={styles.stats}>
        <Stat value={data.registered} label={data.registered === 1 ? "Negocio registrado" : "Negocios registrados"} />
        <Stat value={data.converted} label={data.converted === 1 ? "Ya creó su tarjeta" : "Ya crearon su tarjeta"} highlight />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Negocios que invitaste</Text>
        {data.items.length === 0 ? (
          <Text style={styles.muted}>Todavía nadie se registró con tu enlace. Cuando alguien lo haga, aparecerá aquí.</Text>
        ) : (
          data.items.map((item, index) => (
            <View key={item.id} style={[styles.row, index > 0 && styles.divider]}>
              <View style={[styles.rowIcon, item.status === "CONVERTED" && styles.rowIconDone]}>
                <Ionicons name={item.status === "CONVERTED" ? "checkmark" : "storefront-outline"} size={18} color={item.status === "CONVERTED" ? colors.white : colors.espresso} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.businessName}
                </Text>
                <Text style={styles.rowDetail}>Se registró el {formatDateTime(item.createdAt)}</Text>
              </View>
              <Text style={[styles.pill, item.status === "CONVERTED" ? styles.pillDone : styles.pillWaiting]}>
                {item.status === "CONVERTED" ? "Con tarjeta" : "Registrado"}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function Stat({ value, label, highlight = false }) {
  return (
    <View style={[styles.stat, highlight && styles.statHighlight]}>
      <Text style={[styles.statValue, highlight && { color: colors.white }]}>{value}</Text>
      <Text style={[styles.statLabel, highlight && { color: colors.white }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  hero: { backgroundColor: colors.espresso, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.sm },
  eyebrow: { ...typography.label, color: colors.caramel },
  heroTitle: { fontFamily: fonts.displayHeavy, fontSize: 27, lineHeight: 31, letterSpacing: -0.4, color: colors.onDark },
  heroText: { ...typography.body, color: colors.onDarkSoft },
  codeCard: { backgroundColor: colors.kraft, borderRadius: radius.lg, padding: spacing.xl, alignItems: "center", gap: spacing.xs },
  qr: { padding: spacing.md, backgroundColor: colors.white, borderRadius: 18, marginBottom: spacing.md },
  codeLabel: { ...typography.label, color: colors.espresso, opacity: 0.75 },
  code: { fontFamily: fonts.displayHeavy, fontSize: 34, letterSpacing: 1, color: colors.espresso },
  link: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.espresso, opacity: 0.85, textAlign: "center" },
  actions: { alignSelf: "stretch", gap: spacing.sm, marginTop: spacing.md },
  stats: { flexDirection: "row", gap: spacing.md },
  stat: { flex: 1, backgroundColor: colors.paper, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: spacing.lg, gap: 2 },
  statHighlight: { backgroundColor: colors.success, borderColor: colors.success },
  statValue: { fontFamily: fonts.displayHeavy, fontSize: 34, lineHeight: 38, color: colors.ink },
  statLabel: { ...typography.caption, color: colors.muted },
  section: { backgroundColor: colors.paper, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  sectionTitle: { ...typography.title, paddingVertical: spacing.sm },
  muted: { ...typography.body, color: colors.muted, paddingBottom: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  divider: { borderTopWidth: 1, borderTopColor: colors.line },
  rowIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.kraftSoft, alignItems: "center", justifyContent: "center" },
  rowIconDone: { backgroundColor: colors.success },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  rowDetail: { ...typography.caption },
  pill: { fontFamily: fonts.bold, fontSize: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, overflow: "hidden" },
  pillDone: { backgroundColor: colors.successSoft, color: colors.success },
  pillWaiting: { backgroundColor: colors.warningSoft, color: colors.warning }
});
