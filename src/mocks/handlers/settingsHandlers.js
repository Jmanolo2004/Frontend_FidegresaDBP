import { getDatabase, resetDatabase, saveDatabase } from "../database";
import { badRequest, notFound, respond } from "../http";
import { buildSuggestions } from "./metricsHandlers";

const EDITABLE_SETTINGS = ["marca", "perfilNombre", "perfilCorreo", "perfilTelefono", "tema"];

function upcomingBirthdays(db) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return db.clientes.filter(person => {
    if (!person.cumpleanos) return false;
    const [day, month] = person.cumpleanos.split("/").map(Number);
    const birthday = new Date(now.getFullYear(), month - 1, day);
    if (birthday < today) birthday.setFullYear(birthday.getFullYear() + 1);
    return (birthday - today) / 86400000 <= 7;
  }).length;
}

export const settingsHandlers = [
  {
    method: "get",
    path: "/settings",
    auth: true,
    handler: () => respond(getDatabase().configuracion)
  },
  {
    method: "patch",
    path: "/settings",
    auth: true,
    handler: ({ body, user }) => {
      const db = getDatabase();
      const settings = db.configuracion;
      for (const key of EDITABLE_SETTINGS) {
        if (body[key] === undefined) continue;
        const value = String(body[key]).trim();
        if (["marca", "perfilNombre", "perfilCorreo"].includes(key) && !value) throw badRequest("Completa los campos obligatorios.");
        if (key === "tema" && !["claro", "oscuro"].includes(value)) throw badRequest("Tema no válido.");
        settings[key] = value;
      }
      if (body.avisos && typeof body.avisos === "object") {
        settings.avisos = { ...settings.avisos };
        for (const [key, value] of Object.entries(body.avisos)) {
          if (!(key in settings.avisos)) throw badRequest("No reconocemos esta preferencia de avisos.");
          settings.avisos[key] = Boolean(value);
        }
      }
      if (body.perfilNombre) user.fullName = settings.perfilNombre;
      saveDatabase();
      return respond(settings);
    }
  },
  {
    method: "post",
    path: "/settings/reset",
    auth: true,
    handler: () => respond(resetDatabase().configuracion)
  },
  {
    method: "get",
    path: "/notices",
    auth: true,
    handler: () => {
      const db = getDatabase();
      const preferences = db.configuracion.avisos || {};
      const suggestions = buildSuggestions(db);
      const byAction = action => suggestions.find(item => item.action === action);
      const birthdays = upcomingBirthdays(db);
      const notices = [
        preferences.inactivos !== false && byAction("Revisar clientes"),
        preferences.localesEnPausa !== false && byAction("Ver ubicaciones"),
        preferences.resenas !== false && byAction("Responder reseñas"),
        preferences.cumpleanos !== false &&
          birthdays && {
            text: `${birthdays} ${birthdays === 1 ? "cliente cumple" : "clientes cumplen"} años esta semana.`,
            to: "/panel/clientes",
            action: "Ver clientes"
          }
      ].filter(Boolean);
      return respond(notices);
    }
  }
];
