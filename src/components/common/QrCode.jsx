import { useMemo } from "react";
import PropTypes from "prop-types";
import qrcode from "qrcode-generator";

/**
 * Dibuja un código QR como SVG, sin pedir nada a internet.
 * level "M" tolera ~15 % de daño: suficiente para pantallas y papel impreso.
 */
export function QrCode({ value, size = 200, label, color = "#241510", background = "#ffffff", margin = 2 }) {
  const { path, count } = useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(String(value));
    qr.make();
    const modules = qr.getModuleCount();
    let d = "";
    for (let row = 0; row < modules; row += 1) {
      for (let col = 0; col < modules; col += 1) {
        if (qr.isDark(row, col)) d += `M${col + margin},${row + margin}h1v1h-1z`;
      }
    }
    return { path: d, count: modules + margin * 2 };
  }, [value, margin]);

  return (
    <svg
      className="qr-code"
      viewBox={`0 0 ${count} ${count}`}
      width={size}
      height={size}
      role="img"
      aria-label={label || `Código QR: ${value}`}
      shapeRendering="crispEdges"
    >
      <rect width={count} height={count} fill={background} />
      <path d={path} fill={color} />
    </svg>
  );
}

QrCode.propTypes = {
  value: PropTypes.string.isRequired,
  size: PropTypes.number,
  label: PropTypes.string,
  color: PropTypes.string,
  background: PropTypes.string,
  margin: PropTypes.number
};
