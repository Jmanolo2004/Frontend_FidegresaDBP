const TOKEN_PATTERN = /^[A-Za-z0-9_-]{4,120}$/;

/**
 * Obtiene el token de la tarjeta a partir del contenido del QR.
 * Acepta el token solo ("FDG-EST-4821") o una URL que lo lleve al final
 * ("https://fidegresa.app/c/FDG-EST-4821"). Devuelve null si no parece una tarjeta de Fidegresa.
 */
export function extractCardToken(rawValue) {
  if (typeof rawValue !== "string") return null;
  const value = rawValue.trim();
  if (!value) return null;

  if (/^https?:\/\//i.test(value)) {
    const withoutQuery = value.split(/[?#]/)[0].replace(/\/+$/, "");
    const lastSegment = withoutQuery.split("/").pop();
    return lastSegment && TOKEN_PATTERN.test(lastSegment) ? decodeURIComponent(lastSegment) : null;
  }

  return TOKEN_PATTERN.test(value) ? value : null;
}
