import { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import { API_URL } from "../../services/apiClient";
import { PROGRAM_TYPES } from "../../services/cardService";
import { formatSoles } from "../../utils/formatters";
import { colors, fonts, isHexColor, mixColors, programColors, readableOn } from "../../utils/theme";
import { StampGrid } from "./StampGrid";
import { LevelBars } from "./LevelBars";

const TYPE_LABELS = { STAMPS: "Estampillas", CASHBACK: "Cashback", LEVELS: "Niveles", GIFT_CARD: "Gift card" };
const TYPE_ICONS = { STAMPS: "cafe", CASHBACK: "cash", LEVELS: "trophy", GIFT_CARD: "gift" };
const STATUS_LABELS = { BLOCKED: "Bloqueada", INACTIVE: "Inactiva", EXPIRED: "Vencida" };

/** Logo y portada del programa: los mismos que usa el pase de Google Wallet (si el negocio no los subió, no se muestran). */
const programImage = (programId, kind) => (programId ? `${API_URL}/public/programs/${programId}/${kind}` : null);

/**
 * La tarjeta como la ve el cliente en Google Wallet: encabezado con logo y dato principal, franja con sellos o niveles,
 * fila de dos datos y, si showCode, el QR en recuadro blanco. Usa lo que calcula el backend (card.display).
 */
export function LoyaltyCardView({ card, color = null, branchName = "", showCode = false }) {
  const display = card.display;
  const background = [display?.colors?.background, color, programColors[card.type]].find(isHexColor) ?? colors.coffee;
  const ink = isHexColor(display?.colors?.text) ? display.colors.text : readableOn(background);
  const accent = isHexColor(display?.colors?.accent) ? display.colors.accent : colors.caramel;
  const business = branchName || card.program.businessName || card.program.name;
  const statusLabel = STATUS_LABELS[card.status] ?? (display?.gift?.expired ? STATUS_LABELS.EXPIRED : null);
  const [first, second] = passFields(card);
  const typeLabel = TYPE_LABELS[card.type] ?? "Tarjeta";
  const balanceType = card.type === PROGRAM_TYPES.CASHBACK || card.type === PROGRAM_TYPES.GIFT_CARD;
  const head = headline(card);

  return (
    <View style={[styles.card, { backgroundColor: background }]} accessibilityLabel={`Tarjeta de ${typeLabel} de ${card.customer.fullName}. ${head.label}: ${head.value}`}>
      <View style={styles.header}>
        <ProgramLogo programId={card.program.id} business={business} tint={ink === colors.white ? background : colors.ink} />
        <Text style={[styles.business, { color: ink }]} numberOfLines={1}>
          {business}
        </Text>
        <View style={styles.headerField}>
          <Text style={[styles.fieldLabel, { color: ink }]} numberOfLines={1}>
            {head.label}
          </Text>
          <Text style={[styles.headerValue, { color: ink }]} numberOfLines={1}>
            {head.value}
          </Text>
        </View>
      </View>

      {balanceType ? (
        <View style={styles.balanceBody}>
          <Text style={[styles.programName, { color: ink }]} numberOfLines={1}>
            {card.program.name}
          </Text>
          <View style={[styles.fields, styles.fieldsTight]}>
            <Field label={first.label} value={first.value} ink={ink} />
            <Field label={second.label} value={second.value} ink={ink} alignEnd />
          </View>
        </View>
      ) : null}

      <Strip programId={card.program.id} background={background} type={card.type} short={balanceType}>
        {card.type === PROGRAM_TYPES.STAMPS ? (
          <StampGrid total={display?.stamps?.goal ?? card.program.requiredStamps} filled={display?.stamps?.earned ?? card.stampBalance} accent={accent} icon={display?.stamps?.icon} />
        ) : null}
        {card.type === PROGRAM_TYPES.LEVELS ? <LevelBars levels={card.program.levels} currentLevel={display?.levels?.current?.number ?? card.level} background={background} ink={ink} /> : null}
      </Strip>

      {statusLabel ? (
        <View style={styles.statusRow}>
          <View style={styles.statusPill}>
            <Ionicons name="lock-closed" size={12} color={colors.danger} />
            <Text style={styles.statusText}>Tarjeta {statusLabel.toLowerCase()}</Text>
          </View>
        </View>
      ) : null}

      {balanceType ? (
        <View style={styles.fields}>
          <Field label="Cliente" value={card.customer.fullName} ink={ink} small />
          <Field label="Tarjeta" value={card.serialNumber || typeLabel} ink={ink} alignEnd small />
        </View>
      ) : (
        <View style={styles.fields}>
          <Field label={first.label} value={first.value} ink={ink} />
          <Field label={second.label} value={second.value} ink={ink} alignEnd />
        </View>
      )}

      {showCode ? (
        <View style={styles.codeBox}>
          <QRCode value={card.qrToken.toUpperCase()} size={132} color={colors.ink} backgroundColor={colors.white} />
          <Text style={[styles.codeText, { color: mixColors(background, "#111111", 0.65) }]}>{card.serialNumber || card.qrToken.toUpperCase()}</Text>
        </View>
      ) : (
        <View style={styles.bottomSpace} />
      )}
    </View>
  );
}

/** Dato del encabezado: lo que el cliente ve primero en su Wallet (sellos, saldo o nivel). */
function headline(card) {
  const display = card.display;
  if (display?.headline) return { label: display.headlineLabel || TYPE_LABELS[card.type], value: display.headline };
  switch (card.type) {
    case PROGRAM_TYPES.CASHBACK:
      return { label: "Saldo", value: formatSoles(card.cashbackBalance) };
    case PROGRAM_TYPES.GIFT_CARD:
      return { label: "Saldo", value: formatSoles(card.giftBalance) };
    case PROGRAM_TYPES.LEVELS:
      return { label: "Nivel", value: levelName(card) };
    default:
      return { label: "Sellos", value: `${Math.min(card.stampBalance, card.program.requiredStamps)}/${card.program.requiredStamps}` };
  }
}

/** Los dos datos de la fila del pase, según el tipo de tarjeta. */
function passFields(card) {
  const display = card.display;
  switch (card.type) {
    case PROGRAM_TYPES.CASHBACK:
      return [
        { label: "Cashback", value: display?.cashback?.percentText ?? `${card.program.cashbackPercent}%` },
        { label: "Último movimiento", value: display?.cashback?.lastMovement ?? "—" }
      ];
    case PROGRAM_TYPES.GIFT_CARD: {
      const expiresAt = display?.gift?.expiresAt ?? card.expiresAt;
      return [
        { label: "Monto inicial", value: formatSoles(display?.gift?.initial ?? card.giftInitialAmount) },
        { label: "Vence", value: expiresAt ? formatDate(expiresAt) : "Sin vencimiento" }
      ];
    }
    case PROGRAM_TYPES.LEVELS:
      return [
        { label: "Cliente", value: card.customer.fullName },
        { label: "Puntos", value: display?.levels?.pointsText ?? `${card.points} pts` }
      ];
    default: {
      const goal = display?.stamps?.goal ?? card.program.requiredStamps;
      const remaining = display?.stamps?.remaining ?? Math.max(0, goal - card.stampBalance);
      return [
        { label: "Cliente", value: card.customer.fullName },
        remaining === 0 ? { label: "Premio", value: "¡Listo!" } : { label: remaining === 1 ? "Falta" : "Faltan", value: `${remaining} ${remaining === 1 ? "sello" : "sellos"}` }
      ];
    }
  }
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" });
}

function levelName(card) {
  const current = card.program.levels.find(level => level.number === card.level);
  return current?.name || `Nivel ${card.level}`;
}

function ProgramLogo({ programId, business, tint }) {
  const [failed, setFailed] = useState(false);
  const uri = programImage(programId, "logo");
  return (
    <View style={styles.logo}>
      {uri && !failed ? (
        <Image source={{ uri }} style={styles.logoImage} onError={() => setFailed(true)} accessibilityIgnoresInvertColors />
      ) : (
        <Text style={[styles.logoInitial, { color: tint }]}>{(business || "F").trim().charAt(0).toUpperCase()}</Text>
      )}
    </View>
  );
}

/** Franja del pase: la portada del programa o, si no tiene, el color de la tarjeta más oscuro con una marca de agua. */
function Strip({ programId, background, type, short = false, children }) {
  const [failed, setFailed] = useState(false);
  const uri = programImage(programId, "cover");
  const showImage = uri && !failed;
  return (
    <View style={[styles.strip, short && styles.stripShort, { backgroundColor: mixColors(background, "#000000", 0.28) }]}>
      {showImage ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => setFailed(true)} accessibilityIgnoresInvertColors />
      ) : (
        <>
          <View style={[styles.stripGlow, { backgroundColor: mixColors(background, "#ffffff", 0.12) }]} />
          <Ionicons name={TYPE_ICONS[type] ?? "cafe"} size={150} color="rgba(255,255,255,0.10)" style={styles.watermark} />
        </>
      )}
      {showImage && children ? <View style={styles.stripShade} /> : null}
      {children}
    </View>
  );
}

function Field({ label, value, ink, alignEnd = false, small = false }) {
  return (
    <View style={[styles.field, alignEnd && styles.fieldEnd]}>
      <Text style={[styles.fieldLabel, { color: ink }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[small ? styles.fieldValueSmall : styles.fieldValue, { color: ink }, alignEnd && styles.textEnd]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    overflow: "hidden",
    elevation: 6,
    shadowColor: "#140e0a",
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 }
  },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 14 },
  logo: { width: 38, height: 38, borderRadius: 8, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  logoImage: { width: "100%", height: "100%" },
  logoInitial: { fontFamily: fonts.displayHeavy, fontSize: 20 },
  business: { flex: 1, fontFamily: fonts.bold, fontSize: 16 },
  headerField: { alignItems: "flex-end", maxWidth: "45%" },
  headerValue: { fontFamily: fonts.display, fontSize: 18, lineHeight: 22 },
  balanceBody: { paddingHorizontal: 18, paddingTop: 4, paddingBottom: 18, gap: 12 },
  programName: { fontFamily: fonts.display, fontSize: 22, lineHeight: 26 },
  strip: { aspectRatio: 760 / 370, overflow: "hidden", justifyContent: "center" },
  stripShort: { aspectRatio: 760 / 230 },
  stripGlow: { position: "absolute", width: "80%", aspectRatio: 1, borderRadius: 999, top: "-55%", left: "-20%", opacity: 0.55 },
  watermark: { position: "absolute", right: -18, bottom: -28 },
  stripShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.18)" },
  statusRow: { paddingHorizontal: 18, paddingTop: 12 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", backgroundColor: colors.white, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { color: colors.danger, fontSize: 12, fontFamily: fonts.bold },
  fieldsTight: { paddingHorizontal: 0, paddingTop: 0 },
  fields: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 16, paddingHorizontal: 18, paddingTop: 16 },
  field: { flexShrink: 1, minWidth: 0, gap: 3 },
  fieldEnd: { alignItems: "flex-end", flexShrink: 0, maxWidth: "55%" },
  fieldLabel: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.9, textTransform: "uppercase", opacity: 0.72 },
  fieldValue: { fontFamily: fonts.display, fontSize: 20, lineHeight: 24 },
  fieldValueSmall: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 19 },
  textEnd: { textAlign: "right" },
  codeBox: { alignSelf: "center", alignItems: "center", gap: 8, marginTop: 22, marginBottom: 24, padding: 14, paddingBottom: 10, borderRadius: 18, backgroundColor: colors.white },
  codeText: { fontFamily: fonts.bold, fontSize: 13, letterSpacing: 0.5 },
  bottomSpace: { height: 18 }
});
