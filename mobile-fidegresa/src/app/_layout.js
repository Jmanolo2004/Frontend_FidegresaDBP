import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../contexts/AuthContext";
import { BranchProvider } from "../contexts/BranchContext";
import { ToastProvider } from "../contexts/ToastContext";
import { OfflineBanner } from "../components/OfflineBanner";
import { LoadingView } from "../components/StateViews";
import { useAuth } from "../hooks/useAuth";
import { colors } from "../utils/theme";

export { ErrorBoundary } from "expo-router";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ToastProvider>
          <StatusBar style="light" />
          <RootNavigator />
        </ToastProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

/** Rutas protegidas: sin sesión solo existe el login; con sesión, la app del cajero. */
function RootNavigator() {
  const { status, user } = useAuth();

  if (status === "loading") {
    return (
      <View style={{ flex: 1, backgroundColor: colors.cream }}>
        <LoadingView message="Abriendo Fidegresa…" />
      </View>
    );
  }

  const signedIn = status === "authenticated";
  // La clave reinicia el local elegido cuando cambia el usuario.
  return (
    <BranchProvider key={user?.email ?? "anonymous"}>
      <View style={{ flex: 1, backgroundColor: colors.espresso }}>
        <OfflineBanner />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.espresso },
            headerTintColor: colors.cream,
            headerTitleStyle: { fontWeight: "700" },
            contentStyle: { backgroundColor: colors.cream }
          }}
        >
          <Stack.Protected guard={signedIn}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="card/[qrToken]" options={{ title: "Tarjeta", headerBackTitle: "Escanear" }} />
            <Stack.Screen name="manual" options={{ title: "Manual de uso", headerBackTitle: "Mi cuenta" }} />
          </Stack.Protected>
          <Stack.Protected guard={!signedIn}>
            <Stack.Screen name="login" options={{ headerShown: false }} />
          </Stack.Protected>
        </Stack>
      </View>
    </BranchProvider>
  );
}
