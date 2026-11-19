/** Paleta y medidas compartidas: la misma identidad café y crema del panel web. */
export const colors = {
  espresso: "#2a1a12",
  coffee: "#5c3a28",
  caramel: "#c98a45",
  kraft: "#d8b98c",
  cream: "#f7f3ee",
  paper: "#fffdf9",
  line: "#e6dccf",
  ink: "#2a1a12",
  muted: "#6f5a4b",
  success: "#2f7a52",
  successSoft: "#e3f2e9",
  danger: "#b23a2b",
  dangerSoft: "#f8e3df",
  warning: "#9a6200",
  warningSoft: "#fbefd8",
  white: "#ffffff",
  overlay: "rgba(20, 12, 8, 0.62)"
};

/** Color de cada tipo de tarjeta, igual que en el diseño de Fidegresa (deck y wallet). */
export const programColors = {
  STAMPS: "#d9a21b",
  CASHBACK: "#1f5b3c",
  LEVELS: "#8b4fd8",
  GIFT_CARD: "#1c2d8f"
};

export const radius = { sm: 10, md: 16, lg: 24, pill: 999 };
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const typography = {
  display: { fontFamily: "serif", fontSize: 28, fontWeight: "700", color: colors.ink },
  title: { fontSize: 20, fontWeight: "700", color: colors.ink },
  subtitle: { fontSize: 16, fontWeight: "600", color: colors.ink },
  body: { fontSize: 15, color: colors.ink },
  caption: { fontSize: 13, color: colors.muted },
  label: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", color: colors.muted }
};
