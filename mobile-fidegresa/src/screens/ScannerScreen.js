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
import { colors, programColors, radius, spacing, typography } from "../utils/theme";

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
      <ScrollView contentContainerStyle={styles.fallback} keyboardShouldPersistTaps="handled">
        <Text style={styles.fallbackTitle}>¿Qué quieres hacer?</Text>
        <Text style={styles.fallbackText}>
          {canUseCamera
            ? "Escanea el QR del cliente. La app reconoce sola si es de estampillas, cashback, niveles o gift card."
            : "Este equipo no tiene cámara disponible. Busca al cliente en la lista de abajo."}
        </Text>

        <ActionTile
          icon="scan-outline"
          title="Escanear tarjeta"
          text="Suma sellos, cashback o puntos por la compra."
          color={colors.espresso}
          disabled={!canUseCamera}
          onPress={() => openCamera("card")}
        />
        <ActionTile
          icon="gift-outline"
          title="Escanear recompensa"
          text="Canjea el premio, usa el saldo o cobra con gift card."
          color={colors.caramel}
          disabled={!canUseCamera}
          onPress={() => openCamera("reward")}
        />

        <ActionTile
          icon="person-add-outline"
          title="Registrar cliente nuevo"
          text="Únelo al club y entrégale su tarjeta al momento."
          color={colors.success}
          onPress={() => router.push("/register")}
        />

        <View style={styles.typesRow}>
          {TYPE_CHIPS.map(chip => (
            <View key={chip.label} style={[styles.typeChip, { backgroundColor: chip.color }]}>
              <Text style={styles.typeChipText}>{chip.label}</Text>
            </View>
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => setListOpen(value => !value || !canUseCamera)}
          style={styles.listToggle}
          hitSlop={8}
        >
          <Ionicons name="people-outline" size={18} color={colors.coffee} />
          <Text style={styles.listToggleText}>{listOpen || !canUseCamera ? "Buscar cliente sin cámara" : "¿Sin cámara? Buscar cliente"}</Text>
          <Ionicons name={listOpen || !canUseCamera ? "chevron-up" : "chevron-down"} size={18} color={colors.coffee} />
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
        <Text style={styles.title}>Escanear tarjeta</Text>
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

function ActionTile({ icon, title, text, color, onPress, disabled }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.tile, { backgroundColor: color, opacity: disabled ? 0.45 : pressed ? 0.88 : 1 }]}
    >
      <View style={styles.tileIcon}>
        <Ionicons name={icon} size={28} color={color} />
      </View>
      <View style={styles.tileBody}>
        <Text style={styles.tileTitle}>{title}</Text>
        <Text style={styles.tileText}>{text}</Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color={colors.white} />
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
  top: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.md },
  title: { ...typography.title, color: colors.cream },
  cameraWrap: { flex: 1, backgroundColor: "#000", overflow: "hidden", borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  overlay: { flex: 1, justifyContent: "space-between" },
  frameArea: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.lg },
  frame: { width: FRAME_SIZE, height: FRAME_SIZE },
  corner: { position: "absolute", width: CORNER, height: CORNER, borderColor: colors.caramel },
  cornerTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 14 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 14 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 14 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 14 },
  hint: { color: colors.white, fontSize: 15, fontWeight: "700", backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill, overflow: "hidden" },
  controls: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg },
  roundButton: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.cream, alignItems: "center", justifyContent: "center" },
  manualButton: { flex: 1 },
  tile: { alignSelf: "stretch", flexDirection: "row", alignItems: "center", gap: spacing.md, borderRadius: radius.lg, padding: spacing.lg, minHeight: 92 },
  tileIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  tileBody: { flex: 1, gap: 2 },
  tileTitle: { color: colors.white, fontSize: 19, fontWeight: "800" },
  tileText: { color: "rgba(255,255,255,0.85)", fontSize: 14 },
  typesRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: spacing.sm, marginTop: spacing.xs },
  typeChip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill },
  typeChipText: { color: colors.white, fontSize: 12, fontWeight: "800" },
  listToggle: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm, marginTop: spacing.sm },
  listToggleText: { fontSize: 15, fontWeight: "700", color: colors.coffee },
  fallback: { flexGrow: 1, alignItems: "center", padding: spacing.xl, gap: spacing.md, backgroundColor: colors.cream, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  fallbackIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", marginTop: spacing.lg },
  fallbackTitle: { ...typography.title, textAlign: "center" },
  fallbackText: { ...typography.body, color: colors.muted, textAlign: "center", lineHeight: 21 },
  fallbackButton: { alignSelf: "stretch" },
  divider: { flexDirection: "row", alignItems: "center", gap: spacing.sm, alignSelf: "stretch", marginTop: spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.line },
  dividerText: { ...typography.caption },
  manualCard: { alignSelf: "stretch", backgroundColor: colors.paper, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.line },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: colors.overlay },
  sheet: { backgroundColor: colors.cream, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.xl, gap: spacing.lg },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sheetTitle: typography.title
});
