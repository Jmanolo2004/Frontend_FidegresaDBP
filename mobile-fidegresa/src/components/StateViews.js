import { useEffect, useState } from "react";
import { ActivityIndicator, Animated, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppButton } from "./AppButton";
import { colors, radius, spacing, typography } from "../utils/theme";

export function LoadingView({ message = "Cargando…" }) {
  return (
    <View style={styles.center} accessibilityRole="progressbar" accessibilityLabel={message}>
      <ActivityIndicator size="large" color={colors.caramel} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

/** Error con mensaje amigable y botón de reintento cuando el problema es recuperable. */
export function ErrorView({ title = "Algo salió mal", error, onRetry, icon = "cloud-offline-outline", children }) {
  return (
    <View style={styles.center}>
      <View style={[styles.iconBubble, { backgroundColor: colors.dangerSoft }]}>
        <Ionicons name={icon} size={30} color={colors.danger} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{error?.message ?? "Inténtalo de nuevo en unos segundos."}</Text>
      {onRetry ? <AppButton label="Reintentar" icon="refresh" onPress={onRetry} variant="secondary" style={styles.action} /> : null}
      {children}
    </View>
  );
}

export function EmptyView({ title, message, icon = "file-tray-outline", children }) {
  return (
    <View style={styles.center}>
      <View style={styles.iconBubble}>
        <Ionicons name={icon} size={30} color={colors.coffee} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {children}
    </View>
  );
}

/** Bloque gris que late mientras llegan los datos. */
export function SkeletonBlock({ height = 16, width = "100%", style }) {
  const [opacity] = useState(() => new Animated.Value(0.5));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 650, useNativeDriver: true })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={[{ height, width, borderRadius: radius.sm, backgroundColor: colors.line, opacity }, style]} />;
}

/** Esqueleto de la pantalla de tarjeta mientras se consulta el backend. */
export function CardSkeleton() {
  return (
    <View style={styles.skeleton} accessibilityLabel="Cargando tarjeta">
      <SkeletonBlock height={210} style={{ borderRadius: radius.lg }} />
      <SkeletonBlock height={22} width="60%" />
      <SkeletonBlock height={50} />
      <SkeletonBlock height={50} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xxl, gap: spacing.md },
  iconBubble: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", backgroundColor: colors.line },
  title: { ...typography.title, textAlign: "center" },
  message: { ...typography.body, color: colors.muted, textAlign: "center", lineHeight: 21 },
  action: { marginTop: spacing.sm, minWidth: 180 },
  skeleton: { padding: spacing.lg, gap: spacing.lg }
});
