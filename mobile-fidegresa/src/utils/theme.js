/** Paleta, letras y medidas compartidas: las mismas de la landing de Fidegresa (café espresso, crema, kraft y caramelo). */
export const colors = {
  espresso: "#241510",
  toasted: "#3a241a",
  coffee: "#5c3a28",
  caramel: "#e08e3f",
  kraft: "#d8b98c",
  kraftSoft: "#efe1cb",
  cream: "#fbf5ec",
  paper: "#fffdf9",
  line: "#e2d3c1",
  ink: "#2a1a12",
  muted: "#5e4a3c",
  onDark: "#f6ecdd",
  onDarkSoft: "#d9c7b4",
  onDarkLine: "#5a4235",
  success: "#2f6b57",
  successSoft: "#edf5ef",
  danger: "#a54d40",
  dangerSoft: "#f6e4df",
  warning: "#8a5a12",
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

/**
 * Familias cargadas en app/_layout.js. En Android una fuente propia no admite fontWeight, por eso cada peso es una familia:
 * los estilos usan fontFamily y no fontWeight.
 */
export const fonts = {
  display: "BricolageGrotesque_700Bold",
  displayHeavy: "BricolageGrotesque_800ExtraBold",
  regular: "InstrumentSans_400Regular",
  medium: "InstrumentSans_500Medium",
  semibold: "InstrumentSans_600SemiBold",
  bold: "InstrumentSans_700Bold"
};

export const radius = { sm: 10, md: 14, lg: 20, pill: 999 };
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const typography = {
  hero: { fontFamily: fonts.displayHeavy, fontSize: 40, lineHeight: 42, letterSpacing: -1, color: colors.onDark },
  display: { fontFamily: fonts.displayHeavy, fontSize: 30, lineHeight: 34, letterSpacing: -0.6, color: colors.ink },
  title: { fontFamily: fonts.display, fontSize: 21, lineHeight: 26, letterSpacing: -0.2, color: colors.ink },
  subtitle: { fontFamily: fonts.display, fontSize: 17, lineHeight: 22, color: colors.ink },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.ink },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.muted },
  label: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: colors.muted }
};

/** Mezcla dos colores hex (#rrggbb); amount 0 = a, 1 = b. */
export function mixColors(a, b, amount) {
  const parse = hex => [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16));
  const [ra, ga, ba] = parse(a);
  const [rb, gb, bb] = parse(b);
  const channel = (x, y) => Math.round(x + (y - x) * amount).toString(16).padStart(2, "0");
  return `#${channel(ra, rb)}${channel(ga, gb)}${channel(ba, bb)}`;
}

/** Texto legible sobre un fondo: blanco en fondos oscuros, tinta en los claros. */
export function readableOn(background) {
  if (!/^#[0-9a-f]{6}$/i.test(background ?? "")) return colors.white;
  const [r, g, b] = [1, 3, 5].map(index => {
    const value = parseInt(background.slice(index, index + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.2 ? colors.ink : colors.white;
}

export const isHexColor = value => /^#[0-9a-f]{6}$/i.test(value ?? "");
