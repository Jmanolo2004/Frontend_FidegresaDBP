const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const required = message => value =>
  String(value ?? "").trim() ? "" : message;

export const email = (message = "Escribe un correo válido, por ejemplo tu@negocio.com.") => value =>
  !value || EMAIL_PATTERN.test(String(value).trim()) ? "" : message;

export const minLength = (length, message) => value =>
  !value || String(value).length >= length ? "" : message;

export const maxLength = (length, message) => value =>
  String(value ?? "").length <= length ? "" : message;

export const numberBetween = (min, max, message) => value => {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? "" : message;
};

export const strongPassword = (message = "Usa al menos una letra y un número.") => value =>
  !value || (/[a-zA-Z]/.test(value) && /\d/.test(value)) ? "" : message;

export function runValidators(value, validators = [], values = {}) {
  for (const validate of validators) {
    const error = validate(value, values);
    if (error) return error;
  }
  return "";
}
