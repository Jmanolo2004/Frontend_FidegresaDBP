import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { AppButton } from "../components/AppButton";
import { EmptyView, ErrorView, SkeletonBlock } from "../components/StateViews";
import { TransactionRow } from "../components/TransactionRow";
import { useBranch } from "../hooks/useBranch";
import { usePaginatedList } from "../hooks/usePaginatedList";
import { getTransactions } from "../services/transactionService";
import { colors, radius, spacing, typography } from "../utils/theme";

/** Movimientos registrados en el negocio, del más reciente al más antiguo. */
export function HistoryScreen() {
  const { selectedBranch } = useBranch();
  const [onlyThisBranch, setOnlyThisBranch] = useState(true);
  const branchFilter = onlyThisBranch ? selectedBranch?.id ?? null : null;
  const list = usePaginatedList(({ page, signal }) => getTransactions({ branchId: branchFilter, page, signal }), `branch-${branchFilter ?? "all"}`);

  const openCard = transaction => {
    if (transaction.cardQrToken) router.push({ pathname: "/card/[qrToken]", params: { qrToken: transaction.cardQrToken } });
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Historial</Text>
        {selectedBranch ? (
          <View style={styles.filters} accessibilityRole="tablist">
            <FilterChip label={selectedBranch.name} selected={onlyThisBranch} onPress={() => setOnlyThisBranch(true)} />
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
        <ErrorView title="No pudimos cargar el historial" error={list.error} onRetry={list.retry} />
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={list.items.length === 0 ? styles.emptyContainer : styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <Pressable accessibilityRole="button" accessibilityHint="Abre la tarjeta del cliente" onPress={() => openCard(item)} disabled={!item.cardQrToken}>
              <TransactionRow transaction={item} currentBranchName={onlyThisBranch ? selectedBranch?.name : null} />
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
  safe: { flex: 1, backgroundColor: colors.cream },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm, gap: spacing.md },
  title: typography.display,
  filters: { flexDirection: "row", gap: spacing.sm },
  chip: { flexShrink: 1, paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  chipSelected: { backgroundColor: colors.espresso, borderColor: colors.espresso },
  chipText: { fontSize: 14, fontWeight: "700", color: colors.coffee },
  chipTextSelected: { color: colors.cream },
  skeletons: { padding: spacing.lg, gap: spacing.md },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  emptyContainer: { flexGrow: 1 },
  separator: { height: 1, backgroundColor: colors.line },
  footer: { paddingVertical: spacing.lg, gap: spacing.sm },
  footerError: { ...typography.caption, textAlign: "center" },
  footerEnd: { ...typography.caption, textAlign: "center", paddingVertical: spacing.lg }
});
