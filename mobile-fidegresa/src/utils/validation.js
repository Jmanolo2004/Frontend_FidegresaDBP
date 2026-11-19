const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateLogin({ email, password }) {
  const errors = {};
  if (!email.trim()) errors.email = "Ingresa tu correo.";
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = "Revisa el formato del correo.";
  if (!password) errors.password = "Ingresa tu contraseña.";
  else if (password.length < 6) errors.password = "La contraseña tiene al menos 6 caracteres.";
  return errors;
}

/** Convierte lo que escribe el cajero ("12,5", "12.50") en número; NaN si no es válido. */
export function parseAmount(text) {
  if (typeof text !== "string") return Number.NaN;
  const normalized = text.trim().replace(",", ".");
  if (!/^\d{1,6}(\.\d{0,2})?$/.test(normalized)) return Number.NaN;
  return Number(normalized);
}

/** Mensaje de error para un monto en soles, o null si es válido. */
export function validateAmount(text, { max, maxLabel } = {}) {
  if (!text || !text.trim()) return "Ingresa un monto.";
  const amount = parseAmount(text);
  if (Number.isNaN(amount)) return "Usa solo números, con hasta 2 decimales.";
  if (amount <= 0) return "El monto debe ser mayor a S/ 0.00.";
  if (amount > 99999) return "El monto es demasiado alto.";
  if (Number.isFinite(max) && amount > max) return maxLabel || "El monto supera el saldo disponible.";
  return null;
}
