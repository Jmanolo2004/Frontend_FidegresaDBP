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
import { colors, fonts } from "../utils/theme";
import { useFonts } from "expo-font";
// Solo los pesos que usa la app (importar el paquete completo agregaría todas las variantes al APK).
import { BricolageGrotesque_700Bold } from "@expo-google-fonts/bricolage-grotesque/700Bold";
import { BricolageGrotesque_800ExtraBold } from "@expo-google-fonts/bricolage-grotesque/800ExtraBold";
import { InstrumentSans_400Regular } from "@expo-google-fonts/instrument-sans/400Regular";
import { InstrumentSans_500Medium } from "@expo-google-fonts/instrument-sans/500Medium";
import { InstrumentSans_600SemiBold } from "@expo-google-fonts/instrument-sans/600SemiBold";
import { InstrumentSans_700Bold } from "@expo-google-fonts/instrument-sans/700Bold";

export { ErrorBoundary } from "expo-router";

export default function RootLayout() {
  // Las letras de la landing: Bricolage Grotesque en títulos y cifras, Instrument Sans en el resto.
  // Vienen dentro de la app (no se descargan); si fallaran, la app sigue con la letra del sistema.
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    InstrumentSans_400Regular,
    InstrumentSans_500Medium,
    InstrumentSans_600SemiBold,
    InstrumentSans_700Bold
  });
  if (!fontsLoaded && !fontError) return <View style={{ flex: 1, backgroundColor: colors.espresso }} />;

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
            headerTitleStyle: { fontFamily: fonts.display, fontSize: 19 },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.cream }
          }}
        >
          <Stack.Protected guard={signedIn}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="card/[qrToken]" options={{ title: "Tarjeta", headerBackTitle: "Escanear" }} />
            <Stack.Screen name="manual" options={{ title: "Manual de uso", headerBackTitle: "Mi cuenta" }} />
            <Stack.Screen name="register" options={{ title: "Nuevo cliente", headerBackTitle: "Escanear" }} />
          </Stack.Protected>
          <Stack.Protected guard={!signedIn}>
            <Stack.Screen name="login" options={{ headerShown: false }} />
          </Stack.Protected>
        </Stack>
      </View>
    </BranchProvider>
  );
}
