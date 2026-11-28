// Reglas del formulario público de la tarjeta (/tarjeta/:code). Sin React, para probarlas con node --test.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** "AAAA-MM-DD" solo si la fecha existe (sin 31 de febrero) y no es futura. */
export function birthDateOf({ day, month, year }) {
  if (!day || !month || !year) return null;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (date.getUTCDate() !== Number(day) || date.getUTCMonth() !== Number(month) - 1 || date.getTime() > Date.now()) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Las mismas reglas que valida el backend, para avisar antes de enviar. */
export function validateJoin(values) {
  const errors = {};
  if (!values.firstName.trim()) errors.firstName = "Escribe tu nombre.";
  if (!values.lastName.trim()) errors.lastName = "Escribe tu apellido.";
  if (!EMAIL.test(values.email.trim())) errors.email = "Escribe un correo válido, por ejemplo valeria@gmail.com.";
  if (!values.day || !values.month || !values.year) errors.birthDate = "Elige día, mes y año.";
  else if (!birthDateOf(values)) errors.birthDate = "Esa fecha no existe. Revisa el día y el mes.";
  return errors;
}

/** "Valeria R." para la vista previa de la tarjeta mientras escribe. */
export function previewName(firstName, lastName) {
  const first = firstName.trim().split(/\s+/)[0];
  if (!first) return "Tu nombre";
  const initial = lastName.trim()[0];
  return initial ? `${first} ${initial.toUpperCase()}.` : first;
}
