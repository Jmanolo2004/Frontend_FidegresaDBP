import { getDatabase, saveDatabase } from "../database";
import { badRequest, conflict, HttpError, nextId, notFound, requireText, respond } from "../http";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function requireManager(user) {
  if (!user || !["ADMIN", "BRAND_ADMIN"].includes(user.role)) {
    throw new HttpError(403, "Solo una cuenta administradora puede gestionar el equipo de demostración.");
  }
}

function membersOf(db, user) {
  return (db.miembrosEquipo || []).filter(member => member.ownerId === user.id);
}

function validate(db, user, body, currentId) {
  const name = requireText(body.name, "Escribe el nombre del miembro.");
  const email = requireText(body.email, "Escribe el correo del miembro.").toLowerCase();
  if (name.length > 100) throw badRequest("Usa hasta 100 caracteres para el nombre.");
  if (email.length > 160 || !EMAIL_PATTERN.test(email)) throw badRequest("Escribe un correo válido.");
  if (email === user.email.toLowerCase() || membersOf(db, user).some(member => member.id !== currentId && member.email === email)) {
    throw conflict("Este correo ya está en el equipo de demostración.");
  }
  if (!["Trabajador", "Administrador"].includes(body.role)) throw badRequest("Selecciona un rol válido.");
  if (!Array.isArray(body.branchIds) || body.branchIds.length === 0) throw badRequest("Selecciona al menos un local.");
  const branchIds = [...new Set(body.branchIds.map(Number))];
  if (branchIds.some(id => !Number.isInteger(id) || !db.ubicaciones.some(branch => branch.id === id))) {
    throw badRequest("Selecciona locales válidos.");
  }
  const currentBranchId = Number(body.currentBranchId);
  if (!branchIds.includes(currentBranchId)) throw badRequest("El local actual debe estar incluido en los locales seleccionados.");
  return { name, email, role: body.role, branchIds, currentBranchId };
}

function saveMembers(db, members) {
  const previous = db.miembrosEquipo;
  db.miembrosEquipo = members;
  if (!saveDatabase()) {
    db.miembrosEquipo = previous;
    throw new HttpError(500, "No se pudo guardar el equipo de demostración en este navegador.");
  }
}

function findMember(db, user, id) {
  const member = membersOf(db, user).find(item => item.id === Number(id));
  if (!member) throw notFound("No encontramos este miembro de demostración.");
  return member;
}

export const teamHandlers = [
  {
    method: "get", path: "/demo/team", auth: true,
    handler: ({ user }) => {
      requireManager(user);
      return respond(membersOf(getDatabase(), user));
    }
  },
  {
    method: "post", path: "/demo/team", auth: true,
    handler: ({ body, user }) => {
      requireManager(user);
      const db = getDatabase();
      const members = db.miembrosEquipo || [];
      const member = { id: nextId(members), ownerId: user.id, ...validate(db, user, body) };
      saveMembers(db, [...members, member]);
      return respond(member, 201);
    }
  },
  {
    method: "put", path: "/demo/team/:id", auth: true,
    handler: ({ params, body, user }) => {
      requireManager(user);
      const db = getDatabase();
      const member = findMember(db, user, params.id);
      const updated = { ...member, ...validate(db, user, body, member.id) };
      saveMembers(db, db.miembrosEquipo.map(item => item === member ? updated : item));
      return respond(updated);
    }
  },
  {
    method: "delete", path: "/demo/team/:id", auth: true,
    handler: ({ params, user }) => {
      requireManager(user);
      const db = getDatabase();
      const member = findMember(db, user, params.id);
      saveMembers(db, db.miembrosEquipo.filter(item => item !== member));
      return respond(null, 204);
    }
  }
];
