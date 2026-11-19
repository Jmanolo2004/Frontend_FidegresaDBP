import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { colors, spacing } from "../utils/theme";

/** Franja visible cuando el celular pierde conexión. */
export function OfflineBanner() {
  const isOnline = useNetworkStatus();
  if (isOnline !== false) return null;
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Ionicons name="cloud-offline-outline" size={16} color={colors.white} />
      <Text style={styles.text}>Sin internet. Los movimientos no se registrarán hasta que vuelva la conexión.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.danger, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  text: { flex: 1, color: colors.white, fontSize: 13, fontWeight: "600" }
});
