import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BranchPicker } from "./BranchPicker";
import { useBranch } from "../hooks/useBranch";
import { useCurrentLocation } from "../hooks/useCurrentLocation";
import { findNearestBranch } from "../utils/geo";
import { formatDistance } from "../utils/formatters";
import { colors, radius, spacing } from "../utils/theme";

/** Si el local más cercano está a menos de esta distancia, se elige solo. */
const AUTO_SELECT_RADIUS_METERS = 400;

/**
 * Barra superior del escáner: detecta el local por GPS y deja cambiarlo a mano.
 * Muestra la dirección (API externa) para que el cajero confirme dónde está.
 */
export function BranchBar() {
  const { branches, selectedBranch, selectionSource, selectBranch } = useBranch();
  const location = useCurrentLocation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const askedRef = useRef(false);
  const { locate } = location;

  // Pide la ubicación una vez, cuando ya se conocen los locales.
  useEffect(() => {
    if (askedRef.current || branches.length === 0) return;
    askedRef.current = true;
    locate();
  }, [branches.length, locate]);

  const nearest = useMemo(() => (location.position ? findNearestBranch(location.position, branches) : null), [location.position, branches]);

  // El GPS elige el local cercano, pero nunca pisa una elección manual del cajero.
  useEffect(() => {
    if (nearest && nearest.distance <= AUTO_SELECT_RADIUS_METERS && selectionSource !== "manual" && selectedBranch?.id !== nearest.branch.id) {
      selectBranch(nearest.branch.id, "gps");
    }
  }, [nearest, selectionSource, selectedBranch?.id, selectBranch]);

  const isNearSelected = nearest && selectedBranch && nearest.branch.id === selectedBranch.id;
  let detail;
  if (location.status === "locating") detail = "Buscando tu ubicación…";
  else if (location.message) detail = location.message;
  else if (isNearSelected) detail = `A ${formatDistance(nearest.distance)}${location.address ? ` · ${location.address}` : ""}`;
  else if (location.address) detail = `Estás en ${location.address}`;
  else if (!selectedBranch) detail = "Toca para elegir dónde estás atendiendo.";
  else detail = selectionSource === "manual" ? "Elegido a mano" : "Último local usado";

  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={`Local: ${selectedBranch?.name ?? "sin elegir"}. Cambiar local`} onPress={() => setPickerOpen(true)} style={styles.bar}>
        <View style={[styles.icon, !selectedBranch && styles.iconWarning]}>
          {location.status === "locating" ? <ActivityIndicator size="small" color={colors.cream} /> : <Ionicons name={selectionSource === "gps" ? "navigate" : "storefront"} size={18} color={colors.cream} />}
        </View>
        <View style={styles.text}>
          <Text style={styles.name} numberOfLines={1}>
            {selectedBranch?.name ?? "Elige tu local"}
          </Text>
          <Text style={styles.detail} numberOfLines={1}>
            {detail}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={18} color={colors.cream} />
      </Pressable>
      {location.status === "denied" && !location.canAskAgain ? (
        <Pressable accessibilityRole="button" onPress={location.openSettings} style={styles.settingsLink}>
          <Text style={styles.settingsText}>Abrir ajustes de ubicación</Text>
        </Pressable>
      ) : null}
      <BranchPicker visible={pickerOpen} onClose={() => setPickerOpen(false)} position={location.position} />
    </>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: "rgba(20,12,8,0.78)", borderRadius: radius.md, padding: spacing.md },
  icon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.coffee, alignItems: "center", justifyContent: "center" },
  iconWarning: { backgroundColor: colors.danger },
  text: { flex: 1, minWidth: 0 },
  name: { color: colors.cream, fontSize: 16, fontWeight: "800" },
  detail: { color: colors.kraft, fontSize: 12.5, marginTop: 2 },
  settingsLink: { alignSelf: "flex-start", marginTop: spacing.sm, paddingVertical: 4 },
  settingsText: { color: colors.kraft, fontSize: 13, fontWeight: "700", textDecorationLine: "underline" }
});
