import { useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { AppButton } from "../components/AppButton";
import { BranchBar } from "../components/BranchBar";
import { ALL_CARDS, CardFilterSheet } from "../components/CardFilterSheet";
import { EmptyView, ErrorView, SkeletonBlock } from "../components/StateViews";
import { TransactionRow } from "../components/TransactionRow";
import { useBranch } from "../hooks/useBranch";
import { usePaginatedList } from "../hooks/usePaginatedList";
import { getTransactions } from "../services/transactionService";
import { dayKey, formatDayHeading } from "../utils/formatters";
import { colors, fonts, radius, spacing, typography } from "../utils/theme";

/** Movimientos registrados en el negocio, del más reciente al más antiguo. */
export function HistoryScreen() {
  const { selectedBranch } = useBranch();
  const [onlyThisBranch, setOnlyThisBranch] = useState(true);
  const [cardFilter, setCardFilter] = useState(ALL_CARDS);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [cardsOpen, setCardsOpen] = useState(false);
  const branchFilter = onlyThisBranch ? selectedBranch?.id ?? null : null;
  const list = usePaginatedList(
    ({ page, signal }) => getTransactions({ branchId: branchFilter, programType: cardFilter.programType, programId: cardFilter.programId, page, signal }),
    `branch-${branchFilter ?? "all"}-type-${cardFilter.programType ?? "all"}-program-${cardFilter.programId ?? "all"}`
  );
  const filteringCards = Boolean(cardFilter.programType || cardFilter.programId);

  // Movimientos agrupados por día ("Hoy", "Ayer", "lunes 23 nov."), del más reciente al más antiguo.
  const sections = useMemo(() => {
    const groups = [];
    for (const item of list.items) {
      const key = dayKey(item.createdAt);
      const last = groups[groups.length - 1];
      if (last && last.key === key) last.data.push(item);
      else groups.push({ key, title: formatDayHeading(item.createdAt), data: [item] });
    }
    return groups;
  }, [list.items]);

  const openCard = transaction => {
    if (transaction.cardQrToken) router.push({ pathname: "/card/[qrToken]", params: { qrToken: transaction.cardQrToken } });
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Movimientos</Text>
        <Text style={styles.title}>Historial</Text>
        <BranchBar autoLocate={false} />
        <View style={styles.filters}>
          <FilterBox
            icon="storefront-outline"
            label="Locales"
            value={onlyThisBranch && selectedBranch ? "Solo este local" : "Todos los locales"}
            onPress={() => setScopeOpen(true)}
          />
          <FilterBox icon="albums-outline" label="Tarjetas" value={cardFilter.label} active={filteringCards} onPress={() => setCardsOpen(true)} />
        </View>
      </View>

      {list.loading ? (
        <View style={styles.skeletons}>
          {Array.from({ length: 6 }, (_, index) => (
            <SkeletonBlock key={index} height={56} />
          ))}
        </View>
      ) : list.error && list.items.length === 0 ? (
        <View style={styles.list}>
          <ErrorView title="No pudimos cargar el historial" error={list.error} onRetry={list.retry} />
        </View>
      ) : (
        <SectionList
          style={styles.list}
          sections={sections}
          keyExtractor={item => String(item.id)}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={list.items.length === 0 ? styles.emptyContainer : styles.listContent}
          renderSectionHeader={({ section }) => (
            <View style={styles.dayHeader}>
              <Text style={styles.dayTitle}>{section.title}</Text>
              <Text style={styles.dayCount}>{section.data.length === 1 ? "1 movimiento" : `${section.data.length} movimientos`}</Text>
            </View>
          )}
          renderItem={({ item, index, section }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityHint="Abre la tarjeta del cliente"
              onPress={() => openCard(item)}
              disabled={!item.cardQrToken}
              style={({ pressed }) => [
                styles.item,
                index === 0 && styles.itemFirst,
                index === section.data.length - 1 && styles.itemLast,
                index > 0 && styles.itemDivider,
                pressed && { backgroundColor: colors.kraftSoft }
              ]}
            >
              <TransactionRow transaction={item} currentBranchName={onlyThisBranch ? selectedBranch?.name : null} timeOnly />
            </Pressable>
          )}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={colors.caramel} colors={[colors.caramel]} />}
          ListEmptyComponent={
            <EmptyView
              title="Aún no hay movimientos"
              message={
                filteringCards
                  ? `No hay movimientos de ${cardFilter.label}${onlyThisBranch && selectedBranch ? ` en ${selectedBranch.name}` : ""}. Prueba con otra tarjeta o con todos los locales.`
                  : onlyThisBranch && selectedBranch
                    ? `Cuando registres sellos, compras o cobros en ${selectedBranch.name} aparecerán aquí.`
                    : "Cuando tu equipo registre movimientos aparecerán aquí."
              }
              icon="time-outline"
            />
          }
          ListFooterComponent={
            list.loadingMore ? (
              <ActivityIndicator style={styles.footer} color={colors.caramel} />
            ) : list.error ? (
              <View style={styles.footer}>
                <Text style={styles.footerError}>{list.error.message}</Text>
                <AppButton label="Cargar más" variant="secondary" icon="refresh" onPress={list.retry} />
              </View>
            ) : list.isLast && list.items.length > 0 ? (
              <Text style={styles.footerEnd}>No hay más movimientos.</Text>
            ) : null
          }
        />
      )}
      <ScopeSheet
        visible={scopeOpen}
        branchName={selectedBranch?.name}
        onlyThisBranch={onlyThisBranch && Boolean(selectedBranch)}
        onSelect={value => setOnlyThisBranch(value)}
        onClose={() => setScopeOpen(false)}
      />
      <CardFilterSheet
        visible={cardsOpen}
        value={cardFilter}
        branchId={branchFilter}
        onSelect={setCardFilter}
        onClose={() => setCardsOpen(false)}
      />
    </SafeAreaView>
  );
}

/** Cuadro de filtro del encabezado: qué se está viendo y, al tocarlo, las opciones. */
function FilterBox({ icon, label, value, active = false, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}. Cambiar`}
      onPress={onPress}
      style={({ pressed }) => [styles.box, active && styles.boxActive, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.boxTop}>
        <Ionicons name={icon} size={14} color={active ? colors.espresso : colors.caramel} />
        <Text style={[styles.boxLabel, active && { color: colors.espresso }]}>{label}</Text>
      </View>
      <View style={styles.boxBottom}>
        <Text style={[styles.boxValue, active && { color: colors.espresso }]} numberOfLines={1}>
          {value}
        </Text>
        <Ionicons name="chevron-down" size={16} color={active ? colors.espresso : colors.onDarkSoft} />
      </View>
    </Pressable>
  );
}

/** Elegir si ver solo el local actual o todos los locales del negocio. */
function ScopeSheet({ visible, branchName, onlyThisBranch, onSelect, onClose }) {
  const options = [
    { value: true, title: "Solo este local", detail: branchName ?? "Elige tu local arriba", disabled: !branchName },
    { value: false, title: "Todos los locales", detail: "Lo registrado en todo el negocio" }
  ];
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Cerrar">
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.sheetTitle}>¿Qué locales quieres ver?</Text>
          {options.map(option => {
            const selected = option.value === onlyThisBranch;
            return (
              <Pressable
                key={option.title}
                accessibilityRole="radio"
                accessibilityState={{ selected, disabled: option.disabled }}
                disabled={option.disabled}
                onPress={() => {
                  onSelect(option.value);
                  onClose();
                }}
                style={[styles.sheetOption, selected && styles.sheetOptionSelected, option.disabled && { opacity: 0.45 }]}
              >
                <View style={styles.sheetText}>
                  <Text style={styles.sheetOptionTitle}>{option.title}</Text>
                  <Text style={styles.sheetOptionDetail}>{option.detail}</Text>
                </View>
                <Ionicons name={selected ? "checkmark-circle" : "ellipse-outline"} size={24} color={selected ? colors.caramel : colors.muted} />
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.espresso },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.lg, gap: spacing.xs },
  eyebrow: { ...typography.label, color: colors.caramel },
  title: { ...typography.hero, marginBottom: spacing.md },
  filters: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  box: { flex: 1, minWidth: 0, backgroundColor: colors.toasted, borderWidth: 1, borderColor: colors.onDarkLine, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: 10, gap: 4 },
  boxActive: { backgroundColor: colors.caramel, borderColor: colors.caramel },
  boxTop: { flexDirection: "row", alignItems: "center", gap: 5 },
  boxLabel: { ...typography.label, fontSize: 10, color: colors.onDarkSoft },
  boxBottom: { flexDirection: "row", alignItems: "center", gap: 4 },
  boxValue: { flex: 1, fontFamily: fonts.bold, fontSize: 15, color: colors.onDark },
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: colors.overlay },
  sheet: { backgroundColor: colors.cream, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.md },
  sheetTitle: { ...typography.title, marginBottom: spacing.xs },
  sheetOption: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper },
  sheetOptionSelected: { borderColor: colors.caramel, backgroundColor: colors.kraftSoft },
  sheetText: { flex: 1 },
  sheetOptionTitle: { fontFamily: fonts.display, fontSize: 17, color: colors.ink },
  sheetOptionDetail: { ...typography.caption },
  list: { flex: 1, backgroundColor: colors.cream, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  skeletons: { flex: 1, padding: spacing.lg, gap: spacing.md, backgroundColor: colors.cream, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  listContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl },
  emptyContainer: { flexGrow: 1 },
  dayHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingTop: spacing.lg, paddingBottom: spacing.sm },
  dayTitle: { ...typography.title },
  dayCount: { ...typography.caption },
  item: { backgroundColor: colors.paper, paddingHorizontal: spacing.lg, borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.line },
  itemFirst: { borderTopWidth: 1, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  itemLast: { borderBottomWidth: 1, borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg },
  itemDivider: { borderTopWidth: 1, borderTopColor: colors.line },
  footer: { paddingVertical: spacing.lg, gap: spacing.sm },
  footerError: { ...typography.caption, textAlign: "center" },
  footerEnd: { ...typography.caption, textAlign: "center", paddingVertical: spacing.lg }
});
