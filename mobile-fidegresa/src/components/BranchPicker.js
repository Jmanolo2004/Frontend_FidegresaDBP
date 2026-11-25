import { FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AppButton } from "./AppButton";
import { EmptyView, ErrorView, LoadingView } from "./StateViews";
import { useBranch } from "../hooks/useBranch";
import { distanceInMeters } from "../utils/geo";
import { formatDistance } from "../utils/formatters";
import { colors, fonts, spacing, typography } from "../utils/theme";

/** Lista de locales para elegir a mano (respaldo cuando no hay GPS). */
export function BranchPicker({ visible, onClose, position }) {
  const { branches, selectedBranch, selectBranch, loading, error, reload } = useBranch();
  const insets = useSafeAreaInsets();

  const sorted = position
    ? [...branches].sort((a, b) => distanceOrInfinity(position, a) - distanceOrInfinity(position, b))
    : branches;

  const handleSelect = async branch => {
    await selectBranch(branch.id, "manual");
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <View style={[styles.container, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.md }]}>
        <View style={styles.header}>
          <Text style={styles.title}>¿En qué local estás?</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={26} color={colors.ink} />
          </Pressable>
        </View>
        {loading && branches.length === 0 ? (
          <LoadingView message="Cargando locales…" />
        ) : error && branches.length === 0 ? (
          <ErrorView title="No pudimos cargar tus locales" error={error} onRetry={reload} />
        ) : branches.length === 0 ? (
          <EmptyView title="Aún no hay locales" message="Crea tus locales en el panel web (sección Ubicaciones) y vuelve a intentarlo." icon="storefront-outline">
            <AppButton label="Actualizar" icon="refresh" variant="secondary" onPress={reload} />
          </EmptyView>
        ) : (
          <FlatList
            data={sorted}
            keyExtractor={branch => String(branch.id)}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => {
              const selected = item.id === selectedBranch?.id;
              const distance = position ? distanceOrInfinity(position, item) : Infinity;
              return (
                <Pressable accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => handleSelect(item)} style={styles.row}>
                  <Ionicons name={selected ? "radio-button-on" : "radio-button-off"} size={22} color={selected ? colors.caramel : colors.muted} />
                  <View style={styles.rowText}>
                    <Text style={styles.name}>{item.name}</Text>
                    {item.address ? <Text style={styles.address}>{item.address}</Text> : null}
                  </View>
                  {Number.isFinite(distance) ? <Text style={styles.distance}>{formatDistance(distance)}</Text> : null}
                </Pressable>
              );
            }}
          />
        )}
      </View>
    </Modal>
  );
}

function distanceOrInfinity(position, branch) {
  if (!Number.isFinite(branch.latitude) || !Number.isFinite(branch.longitude)) return Infinity;
  return distanceInMeters(position, branch);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream, paddingHorizontal: spacing.lg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.lg },
  title: typography.title,
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md, minHeight: 56 },
  rowText: { flex: 1 },
  name: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  address: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  distance: { fontFamily: fonts.bold, fontSize: 13, color: colors.coffee },
  separator: { height: 1, backgroundColor: colors.line }
});
