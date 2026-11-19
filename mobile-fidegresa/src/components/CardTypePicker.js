import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppButton } from "./AppButton";
import { useAsync } from "../hooks/useAsync";
import { CARD_TYPE_OPTIONS, getCardsByType } from "../services/programService";
import { colors, radius, spacing, typography } from "../utils/theme";

/**
 * Registro sin cámara: el cajero elige el tipo de tarjeta (estampillas, cashback, niveles o gift card)
 * y luego al cliente. Con "Volver" regresa a las 4 opciones.
 */
export function CardTypePicker({ onSelect, branchId }) {
  const [type, setType] = useState(null);

  if (!type) {
    return (
      <View style={styles.grid}>
        {CARD_TYPE_OPTIONS.map(option => (
          <Pressable
            key={option.key}
            accessibilityRole="button"
            accessibilityLabel={`Registrar ${option.label}`}
            onPress={() => setType(option)}
            style={({ pressed }) => [styles.option, pressed && styles.pressed]}
          >
            <View style={[styles.optionIcon, { backgroundColor: option.color }]}>
              <Ionicons name={option.icon} size={24} color={colors.white} />
            </View>
            <Text style={styles.optionTitle}>{option.label}</Text>
            <Text style={styles.optionText}>{option.description}</Text>
          </Pressable>
        ))}
      </View>
    );
  }

  return <CustomerList type={type} branchId={branchId} onBack={() => setType(null)} onSelect={onSelect} />;
}

function CustomerList({ type, branchId, onBack, onSelect }) {
  const [search, setSearch] = useState("");
  const { data, error, loading, reload } = useAsync(({ signal }) => getCardsByType(type.key, branchId, { signal }), `${type.key}-${branchId ?? "all"}`);

  const customers = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = data ?? [];
    return query ? list.filter(item => `${item.name} ${item.programName}`.toLowerCase().includes(query)) : list;
  }, [data, search]);

  let content;
  if (loading) {
    content = (
      <View style={styles.state}>
        <ActivityIndicator color={colors.caramel} />
        <Text style={styles.stateText}>Buscando clientes…</Text>
      </View>
    );
  } else if (error) {
    content = (
      <View style={styles.state}>
        <Text style={styles.stateText}>{error.message ?? "No pudimos cargar los clientes."}</Text>
        <AppButton label="Reintentar" icon="refresh" variant="secondary" onPress={reload} />
      </View>
    );
  } else if (!customers.length) {
    content = (
      <View style={styles.state}>
        <Text style={styles.stateText}>
          {search ? "Ningún cliente coincide con la búsqueda." : `Aún no hay clientes con tarjeta de ${type.label.toLowerCase()}.`}
        </Text>
      </View>
    );
  } else {
    content = customers.map(item => (
      <Pressable
        key={item.key}
        accessibilityRole="button"
        accessibilityLabel={`Abrir tarjeta de ${item.name}`}
        onPress={() => onSelect(item.qrToken)}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        <View style={[styles.avatar, { backgroundColor: type.color }]}>
          <Text style={styles.avatarText}>{item.initials || item.name.slice(0, 2).toUpperCase()}</Text>
        </View>
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.rowText} numberOfLines={1}>
            {[item.programName, item.progress].filter(Boolean).join(" · ")}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.muted} />
      </Pressable>
    ));
  }

  return (
    <View style={styles.list}>
      <View style={styles.listHeader}>
        <Pressable accessibilityRole="button" accessibilityLabel="Volver a los tipos de tarjeta" onPress={onBack} hitSlop={10} style={styles.back}>
          <Ionicons name="chevron-back" size={20} color={colors.espresso} />
          <Text style={styles.backText}>Volver</Text>
        </Pressable>
        <Text style={styles.listTitle}>{type.label}</Text>
      </View>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Buscar cliente"
        placeholderTextColor={colors.muted}
        style={styles.search}
        autoCorrect={false}
      />
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, alignSelf: "stretch" },
  option: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.xs
  },
  pressed: { opacity: 0.8 },
  optionIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", marginBottom: spacing.xs },
  optionTitle: { ...typography.subtitle },
  optionText: { ...typography.caption },
  list: { alignSelf: "stretch", gap: spacing.sm },
  listHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.xs },
  back: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper
  },
  backText: { fontSize: 15, fontWeight: "700", color: colors.espresso },
  listTitle: { ...typography.title },
  search: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.ink
  },
  state: { alignItems: "center", gap: spacing.md, paddingVertical: spacing.xl },
  stateText: { ...typography.caption, textAlign: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: spacing.md
  },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.white, fontWeight: "700" },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { ...typography.subtitle },
  rowText: { ...typography.caption }
});
