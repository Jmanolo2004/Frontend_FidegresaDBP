import { useCallback, useEffect, useRef, useState } from "react";
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { AppButton } from "../components/AppButton";
import { BranchBar } from "../components/BranchBar";
import { CardTypePicker } from "../components/CardTypePicker";
import { useToast } from "../hooks/useToast";
import { useBranch } from "../hooks/useBranch";
import { extractCardToken } from "../utils/qrPayload";
import { colors, fonts, programColors, radius, spacing, typography } from "../utils/theme";

const FRAME_SIZE = 250;

/** Pantalla principal: cámara para leer el QR de la tarjeta del cliente. */
export function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraAvailable, setCameraAvailable] = useState(true);
  const [cameraError, setCameraError] = useState(null);
  const [isFocused, setIsFocused] = useState(true);
  const [torchOn, setTorchOn] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [scanMode, setScanMode] = useState("card"); // "card" | "reward"
  const [listOpen, setListOpen] = useState(false);
  const scanLockRef = useRef(false);
  const toast = useToast();
  const { selectedBranch } = useBranch();

  useEffect(() => {
    // isAvailableAsync solo sirve en la web; en iOS y Android la cámara se controla con el permiso.
    if (Platform.OS !== "web") {
      setCameraAvailable(true);
      return;
    }
    CameraView.isAvailableAsync()
      .then(setCameraAvailable)
      .catch(() => setCameraAvailable(false));
  }, []);

  // La cámara solo está activa con la pantalla visible; al volver se puede escanear de nuevo.
  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      scanLockRef.current = false;
      return () => {
        setIsFocused(false);
        setTorchOn(false);
      };
    }, [])
  );

  const openCard = useCallback(
    token => {
      setCameraOpen(false);
      router.push({ pathname: "/card/[qrToken]", params: { qrToken: token, mode: scanMode } });
    },
    [scanMode]
  );

  const handleScanned = useCallback(
    ({ data }) => {
      if (scanLockRef.current) return;
      scanLockRef.current = true;
      const token = extractCardToken(data);
      if (!token) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        toast.error("Ese QR no es de una tarjeta de Fidegresa.");
        setTimeout(() => {
          scanLockRef.current = false;
        }, 1800);
        return;
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      openCard(token);
    },
    [openCard, toast]
  );

  const canUseCamera = cameraAvailable && !cameraError;

  // Abre la cámara pidiendo el permiso si hace falta; si está bloqueado, lleva a Ajustes.
  const openCamera = useCallback(async mode => {
    setScanMode(mode);
    if (permission?.granted) {
      scanLockRef.current = false;
      setCameraOpen(true);
      return;
    }
    if (permission && !permission.canAskAgain) {
      Linking.openSettings();
      return;
    }
    const result = await requestPermission();
    if (result?.granted) {
      scanLockRef.current = false;
      setCameraOpen(true);
    } else {
      toast.error("Sin permiso de cámara. Puedes elegir al cliente de la lista.");
    }
  }, [permission, requestPermission, toast]);

  const openFromList = useCallback(
    token => {
      router.push({ pathname: "/card/[qrToken]", params: { qrToken: token, mode: "card" } });
    },
    []
  );

  const closeCamera = useCallback(() => {
    setCameraOpen(false);
    setTorchOn(false);
  }, []);

  let body;
  if (cameraOpen && canUseCamera && permission?.granted) {
    body = (
      <View style={styles.cameraWrap}>
        {isFocused ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            enableTorch={torchOn}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={handleScanned}
            onMountError={event => setCameraError(event?.message ?? "No se pudo iniciar la cámara.")}
          />
        ) : null}
        <View style={styles.overlay} pointerEvents="box-none">
          <View style={styles.frameArea} pointerEvents="none">
            <View style={styles.frame}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            <Text style={styles.hint}>{scanMode === "reward" ? "Escanea la tarjeta para canjear su recompensa" : "Apunta al código QR de la tarjeta del cliente"}</Text>
          </View>
          <View style={[styles.controls, { paddingBottom: spacing.lg }]}>
            <RoundButton icon={torchOn ? "flash" : "flash-outline"} label={torchOn ? "Apagar linterna" : "Encender linterna"} onPress={() => setTorchOn(value => !value)} />
            <AppButton label="Volver" icon="arrow-back" variant="secondary" onPress={closeCamera} style={styles.manualButton} />
          </View>
        </View>
      </View>
    );
  } else {
    // Pantalla principal del staff: escanear tarjeta o escanear recompensa. El tipo de tarjeta se detecta solo con el QR.
    body = (
      <ScrollView style={styles.sheet} contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
        {!canUseCamera ? (
          <View style={styles.noCamera}>
            <Ionicons name="videocam-off-outline" size={18} color={colors.warning} />
            <Text style={styles.noCameraText}>Este equipo no tiene cámara disponible. Busca al cliente en la lista de abajo.</Text>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Escanear tarjeta"
          accessibilityHint="Abre la cámara para leer el QR del cliente"
          accessibilityState={{ disabled: !canUseCamera }}
          disabled={!canUseCamera}
          onPress={() => openCamera("card")}
          style={({ pressed }) => [styles.mainTile, { opacity: !canUseCamera ? 0.45 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
        >
          <View style={styles.mainTileTop}>
            <View style={styles.mainIcon}>
              <Ionicons name="scan" size={30} color={colors.caramel} />
            </View>
            <Ionicons name="arrow-forward" size={26} color={colors.espresso} />
          </View>
          <Text style={styles.mainTitle}>Escanear tarjeta</Text>
          <Text style={styles.mainText}>Suma sellos, cashback o puntos por la compra.</Text>
        </Pressable>

        <View style={styles.tileRow}>
          <SmallTile
            icon="gift-outline"
            title="Canjear recompensa"
            text="Premio, saldo o gift card"
            background={colors.kraft}
            ink={colors.espresso}
            disabled={!canUseCamera}
            onPress={() => openCamera("reward")}
          />
          <SmallTile
            icon="people-outline"
            title="Programa de referidos"
            text="Invita a otros negocios a Fidegresa"
            background={colors.success}
            ink={colors.onDark}
            onPress={() => router.push("/referrals")}
          />
        </View>

        <View style={styles.ticker} accessibilityLabel="La app reconoce sola tarjetas de estampillas, cashback, niveles y gift card">
          <Text style={styles.tickerLabel}>Reconoce sola</Text>
          <View style={styles.tickerItems}>
            {TYPE_CHIPS.map((chip, index) => (
              <View key={chip.label} style={styles.tickerItem}>
                {index > 0 ? <Ionicons name="star" size={11} color="#6b2f14" /> : null}
                <Text style={styles.tickerText}>{chip.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => setListOpen(value => !value || !canUseCamera)}
          style={({ pressed }) => [styles.listToggle, pressed && { opacity: 0.75 }]}
          hitSlop={8}
        >
          <Ionicons name="people-outline" size={18} color={colors.ink} />
          <Text style={styles.listToggleText}>{listOpen || !canUseCamera ? "Buscar cliente sin cámara" : "¿Sin cámara? Buscar cliente"}</Text>
          <Ionicons name={listOpen || !canUseCamera ? "chevron-up" : "chevron-down"} size={18} color={colors.ink} />
        </Pressable>
        {listOpen || !canUseCamera ? (
          <View style={styles.manualCard}>
            <CardTypePicker onSelect={openFromList} branchId={selectedBranch?.id} />
          </View>
        ) : null}
      </ScrollView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.top}>
        {cameraOpen ? null : (
          <>
            <Text style={styles.eyebrow}>Fidegresa · Caja</Text>
            <Text style={styles.title}>Escanea, suma{"\n"}y premia.</Text>
          </>
        )}
        <BranchBar />
      </View>
      {body}
    </SafeAreaView>
  );
}

const TYPE_CHIPS = [
  { label: "Estampillas", color: programColors.STAMPS },
  { label: "Cashback", color: programColors.CASHBACK },
  { label: "Niveles", color: programColors.LEVELS },
  { label: "Gift card", color: programColors.GIFT_CARD }
];

function SmallTile({ icon, title, text, background, ink, onPress, disabled = false }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.smallTile, { backgroundColor: background, opacity: disabled ? 0.45 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
    >
      <Ionicons name={icon} size={26} color={ink} />
      <View style={styles.smallBody}>
        <Text style={[styles.smallTitle, { color: ink }]}>{title}</Text>
        <Text style={[styles.smallText, { color: ink }]}>{text}</Text>
      </View>
    </Pressable>
  );
}

function RoundButton({ icon, label, onPress }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.roundButton}>
      <Ionicons name={icon} size={22} color={colors.espresso} />
    </Pressable>
  );
}

const CORNER = 34;
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.espresso },
  top: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.lg, gap: spacing.sm },
  eyebrow: { ...typography.label, color: colors.caramel },
  title: { ...typography.hero, marginBottom: spacing.sm },
  cameraWrap: { flex: 1, backgroundColor: "#000", overflow: "hidden", borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  overlay: { flex: 1, justifyContent: "space-between" },
  frameArea: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.lg },
  frame: { width: FRAME_SIZE, height: FRAME_SIZE },
  corner: { position: "absolute", width: CORNER, height: CORNER, borderColor: colors.caramel },
  cornerTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 14 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 14 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 14 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 14 },
  hint: { color: colors.white, fontSize: 15, fontFamily: fonts.semibold, backgroundColor: "rgba(0,0,0,0.55)", paddingHorizontal: spacing.lg, paddingVertical: 8, borderRadius: radius.pill, overflow: "hidden" },
  controls: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg },
  roundButton: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.onDark, alignItems: "center", justifyContent: "center" },
  manualButton: { flex: 1 },
  sheet: { flex: 1, backgroundColor: colors.cream, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  sheetContent: { padding: spacing.lg, paddingTop: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxl },
  noCamera: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.warningSoft, borderRadius: radius.md, padding: spacing.md },
  noCameraText: { flex: 1, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19, color: colors.warning },
  mainTile: { backgroundColor: colors.caramel, borderRadius: 24, padding: spacing.xl, gap: spacing.xs },
  mainTileTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.lg },
  mainIcon: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.espresso, alignItems: "center", justifyContent: "center" },
  mainTitle: { fontFamily: fonts.displayHeavy, fontSize: 30, lineHeight: 33, letterSpacing: -0.6, color: colors.espresso },
  mainText: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 20, color: colors.espresso, opacity: 0.85 },
  tileRow: { flexDirection: "row", gap: spacing.md },
  smallTile: { flex: 1, minHeight: 138, borderRadius: 22, padding: spacing.lg, justifyContent: "space-between", gap: spacing.md },
  smallBody: { gap: 2 },
  smallTitle: { fontFamily: fonts.display, fontSize: 18, lineHeight: 21 },
  smallText: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 17, opacity: 0.85 },
  ticker: { backgroundColor: colors.kraftSoft, borderRadius: 18, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, gap: 6 },
  tickerLabel: { ...typography.label, color: colors.muted },
  tickerItems: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 8, rowGap: 4 },
  tickerItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  tickerText: { fontFamily: fonts.display, fontSize: 17, color: colors.espresso },
  listToggle: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, minHeight: 48, borderRadius: radius.pill, borderWidth: 2, borderColor: colors.ink, marginTop: spacing.xs },
  listToggleText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  manualCard: { alignSelf: "stretch", backgroundColor: colors.paper, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.line }
});
