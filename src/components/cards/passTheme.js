const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function relativeLuminance(hex) {
  const channels = [1, 3, 5].map(start => parseInt(hex.slice(start, start + 2), 16) / 255);
  const [r, g, b] = channels.map(value => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// El texto cambia a oscuro sobre colores claros para mantener un contraste legible.
export function passStyle(card) {
  const primaryInput = card.colores?.primario || card.color;
  const accentInput = card.colores?.acento || card.colorAcento;
  const primary = HEX_COLOR.test(primaryInput || "") ? primaryInput : "#603f2a";
  const accent = HEX_COLOR.test(accentInput || "") ? accentInput : "#c8894f";
  const isLight = relativeLuminance(primary) > 0.36;
  return {
    "--pass-bg": primary,
    "--pass-accent": accent,
    "--pass-ink": isLight ? "#1d1626" : "#ffffff",
    "--pass-ink-soft": isLight ? "rgb(29 22 38 / 80%)" : "rgb(255 255 255 / 92%)",
    "--pass-line": isLight ? "rgb(29 22 38 / 18%)" : "rgb(255 255 255 / 20%)"
  };
}
