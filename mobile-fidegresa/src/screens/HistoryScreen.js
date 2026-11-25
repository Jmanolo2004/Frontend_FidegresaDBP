import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { AppButton } from "../components/AppButton";
import { BranchBar } from "../components/BranchBar";
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
  const branchFilter = onlyThisBranch ? selectedBranch?.id ?? null : null;
  const list = usePaginatedList(({ page, signal }) => getTransactions({ branchId: branchFilter, page, signal }), `branch-${branchFilter ?? "all"}`);

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
        {selectedBranch ? (
          <View style={styles.filters} accessibilityRole="tablist">
            <FilterChip label="Solo este local" selected={onlyThisBranch} onPress={() => setOnlyThisBranch(true)} />
            <FilterChip label="Todos los locales" selected={!onlyThisBranch} onPress={() => setOnlyThisBranch(false)} />
          </View>
        ) : null}
      </View>

      {list.loading ? (
        <View style={styles.skeletons}>
          {Array.from({ length: 6 }, (_, index) => (
            <SkeletonBlock key={index} height={56} />
          ))}
        </View>
      ) : list.error && list.items.length === 0 ? (
        <View style={styles.sheet}>
          <ErrorView title="No pudimos cargar el historial" error={list.error} onRetry={list.retry} />
        </View>
      ) : (
        <SectionList
          style={styles.sheet}
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
              message={onlyThisBranch && selectedBranch ? `Cuando registres sellos, compras o cobros en ${selectedBranch.name} aparecerán aquí.` : "Cuando tu equipo registre movimientos aparecerán aquí."}
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
    </SafeAreaView>
  );
}

function FilterChip({ label, selected, onPress }) {
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected }} onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.espresso },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.lg, gap: spacing.xs },
  eyebrow: { ...typography.label, color: colors.caramel },
  title: { ...typography.hero, marginBottom: spacing.md },
  filters: { flexDirection: "row", gap: spacing.sm, backgroundColor: colors.toasted, borderRadius: radius.md, padding: 4, marginTop: spacing.sm },
  chip: { flex: 1, alignItems: "center", paddingHorizontal: spacing.md, minHeight: 40, justifyContent: "center", borderRadius: 11 },
  chipSelected: { backgroundColor: colors.caramel },
  chipText: { fontSize: 14, fontFamily: fonts.semibold, color: colors.onDarkSoft },
  chipTextSelected: { color: colors.espresso, fontFamily: fonts.bold },
  sheet: { flex: 1, backgroundColor: colors.cream, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
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
