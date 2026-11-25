const solesFormatter = new Intl.NumberFormat("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 12.5 → "S/ 12.50". */
export function formatSoles(value) {
  const amount = Number(value);
  return `S/ ${solesFormatter.format(Number.isFinite(amount) ? amount : 0)}`;
}

/** Redondea a céntimos para no arrastrar errores de coma flotante. */
export function roundToCents(value) {
  return Math.round(Number(value) * 100) / 100;
}

/** "2026-11-15T10:20:00Z" → "15 nov., 10:20". */
export function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("es-PE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** "hace 3 min", "hace 2 h", o la fecha si es más antiguo. */
export function formatRelative(value) {
  if (!value) return "";
  const diffMs = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diffMs)) return "";
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return formatDateTime(value);
}

/** "María Fernanda López" → "ML". */
export function initials(fullName = "") {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return `${first}${last}`.toUpperCase();
}

/** "1500" metros → "1.5 km"; "120" → "120 m". */
export function formatDistance(meters) {
  if (!Number.isFinite(meters)) return "";
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}

/** "2026-11-15T10:20:00Z" → "10:20". */
export function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
}

/** Clave del día (para agrupar) y su título: "Hoy", "Ayer" o "lunes 23 nov.". */
export function dayKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "sin-fecha";
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function formatDayHeading(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(date) === dayKey(today)) return "Hoy";
  if (dayKey(date) === dayKey(yesterday)) return "Ayer";
  const text = date.toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "short" });
  return text.charAt(0).toUpperCase() + text.slice(1);
}
