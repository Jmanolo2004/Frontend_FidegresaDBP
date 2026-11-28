import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ErrorView, LoadingView } from "./StateViews";
import { useAsync } from "../hooks/useAsync";
import { getProgramsByType } from "../services/programService";
import { colors, fonts, programColors, radius, spacing, typography } from "../utils/theme";

/** Los 4 tipos: el valor que entiende el backend (programType), su nombre en /loyalty-programs?type= y su ícono. */
export const CARD_FILTER_TYPES = [
  { programType: "STAMPS", apiType: "Estampillas", label: "Estampillas", icon: "star" },
  { programType: "CASHBACK", apiType: "Cashback", label: "Cashback", icon: "cash" },
  { programType: "LEVELS", apiType: "Niveles", label: "Niveles", icon: "trophy" },
  { programType: "GIFT_CARD", apiType: "Giftcard", label: "Gift card", icon: "gift" }
];

export const ALL_CARDS = { programType: null, programId: null, label: "Todas" };

/**
 * Elegir qué tarjetas ver en el Historial: todas, un tipo (por ejemplo, todas las de cashback) o una tarjeta concreta.
 * Con branchId muestra primero las tarjetas de ese local.
 */
export function CardFilterSheet({ visible, value, branchId, onSelect, onClose }) {
  const insets = useSafeAreaInsets();
  const programs = useAsync(
    async ({ signal }) => {
      if (!visible) return null;
      const lists = await Promise.all(CARD_FILTER_TYPES.map(type => getProgramsByType(type.apiType, { signal })));
      return CARD_FILTER_TYPES.map((type, index) => {
        const all = lists[index];
        const ofBranch = branchId ? all.filter(program => program.branchId === branchId) : [];
        return { ...type, programs: ofBranch.length ? ofBranch : all };
      });
    },
    `${visible ? "open" : "closed"}-${branchId ?? "all"}`
  );

  const choose = filter => {
    onSelect(filter);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <View style={[styles.container, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.md }]}>
        <View style={styles.header}>
          <Text style={styles.title}>¿Qué tarjetas quieres ver?</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={26} color={colors.ink} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.group}>
            <Option
              icon="albums"
              color={colors.espresso}
              title="Todas las tarjetas"
              detail="Estampillas, cashback, niveles y gift cards"
              selected={!value.programType && !value.programId}
              onPress={() => choose(ALL_CARDS)}
            />
          </View>

          {programs.loading && !programs.data ? (
            <LoadingView message="Cargando tus tarjetas…" />
          ) : programs.error ? (
            <ErrorView title="No pudimos cargar tus tarjetas" error={programs.error} onRetry={programs.reload} />
          ) : (
            programs.data?.map(type => (
              <View key={type.programType} style={styles.group}>
                <Option
                  icon={type.icon}
                  color={programColors[type.programType]}
                  title={`Todas de ${type.label.toLowerCase()}`}
                  detail={type.programs.length === 1 ? "1 tarjeta" : `${type.programs.length} tarjetas`}
                  selected={value.programType === type.programType && !value.programId}
                  onPress={() => choose({ programType: type.programType, programId: null, label: type.label })}
                />
                {type.programs.map(program => (
                  <Pressable
                    key={program.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: value.programId === program.id }}
                    onPress={() => choose({ programType: null, programId: program.id, label: program.name })}
                    style={({ pressed }) => [styles.program, pressed && { opacity: 0.7 }]}
                  >
                    <View style={[styles.dot, { backgroundColor: program.color ?? programColors[type.programType] }]} />
                    <Text style={styles.programName} numberOfLines={1}>
                      {program.name}
                    </Text>
                    <Ionicons
                      name={value.programId === program.id ? "radio-button-on" : "radio-button-off"}
                      size={22}
                      color={value.programId === program.id ? colors.caramel : colors.muted}
                    />
                  </Pressable>
                ))}
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function Option({ icon, color, title, detail, selected, onPress }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.option, selected && styles.optionSelected, pressed && { opacity: 0.8 }]}
    >
      <View style={[styles.optionIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={18} color={colors.white} />
      </View>
      <View style={styles.optionText}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionDetail}>{detail}</Text>
      </View>
      <Ionicons name={selected ? "checkmark-circle" : "ellipse-outline"} size={24} color={selected ? colors.caramel : colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream, paddingHorizontal: spacing.lg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.lg },
  title: typography.title,
  content: { gap: spacing.lg, paddingBottom: spacing.xl },
  group: { backgroundColor: colors.paper, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  option: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.xs, borderRadius: radius.md },
  optionSelected: { backgroundColor: colors.kraftSoft },
  optionIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  optionText: { flex: 1 },
  optionTitle: { fontFamily: fonts.display, fontSize: 17, color: colors.ink },
  optionDetail: { ...typography.caption },
  program: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 48, paddingLeft: 52, paddingRight: spacing.xs, borderTopWidth: 1, borderTopColor: colors.line },
  dot: { width: 12, height: 12, borderRadius: 6 },
  programName: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.ink }
});
