import { getDatabase, saveDatabase } from "../database";
import { badRequest, conflict, nextId, notFound, requireText, respond } from "../http";
import { DISTRICT_NAMES } from "../../utils/constants";
import { clampMapPoint, coordinatesFromMap, mapPositionFor } from "../../utils/geo";

function withCustomerCount(db, location) {
  return { ...location, clientes: db.clientes.filter(customer => Number(customer.localId) === Number(location.id)).length };
}

function findBranch(db, id) {
  const branch = db.ubicaciones.find(item => Number(item.id) === Number(id));
  if (!branch) throw notFound("No encontramos esta ubicación.");
  return branch;
}

function validateBranch(db, body, currentId = null) {
  const nombre = requireText(body.nombre, "Escribe el nombre del local.").slice(0, 50);
  const duplicate = db.ubicaciones.some(
    place => Number(place.id) !== Number(currentId) && place.nombre.trim().toLowerCase() === nombre.toLowerCase()
  );
  if (duplicate) throw conflict("Ya existe un local con ese nombre. Elige uno distinto.");
  if (!DISTRICT_NAMES.includes(body.distrito)) throw badRequest("Selecciona un distrito válido.");
  return {
    nombre,
    categoria: requireText(body.categoria, "Elige el tipo de negocio."),
    direccion: requireText(body.direccion, "Escribe la dirección o una referencia.").slice(0, 100),
    distrito: body.distrito,
    horario: String(body.horario || "").trim().slice(0, 60) || "Horario por definir"
  };
}

export const branchHandlers = [
  {
    method: "get",
    path: "/branches",
    auth: true,
    handler: () => {
      const db = getDatabase();
      return respond(db.ubicaciones.map(location => withCustomerCount(db, location)));
    }
  },
  {
    method: "post",
    path: "/branches",
    auth: true,
    handler: ({ body }) => {
      const db = getDatabase();
      const data = validateBranch(db, body);
      const position = mapPositionFor(data.distrito);
      const branch = {
        id: nextId(db.ubicaciones),
        ...data,
        mapX: position.x,
        mapY: position.y,
        latitud: position.latitud,
        longitud: position.longitud,
        activa: true
      };
      db.ubicaciones.push(branch);
      saveDatabase();
      return respond(withCustomerCount(db, branch), 201);
    }
  },
  {
    method: "put",
    path: "/branches/:id",
    auth: true,
    handler: ({ params, body }) => {
      const db = getDatabase();
      const current = findBranch(db, params.id);
      const data = validateBranch(db, body, current.id);
      const position = data.distrito !== current.distrito ? mapPositionFor(data.distrito) : null;
      const updated = {
        ...current,
        ...data,
        ...(position ? { mapX: position.x, mapY: position.y, latitud: position.latitud, longitud: position.longitud } : {})
      };
      if (current.nombre !== updated.nombre) {
        db.tarjetas = db.tarjetas.map(card => (card.negocio === current.nombre ? { ...card, negocio: updated.nombre } : card));
        db.clientes = db.clientes.map(customer =>
          Number(customer.localId) === Number(current.id) ? { ...customer, tarjeta: updated.nombre } : customer
        );
      }
      db.ubicaciones = db.ubicaciones.map(place => (place.id === current.id ? updated : place));
      saveDatabase();
      return respond(withCustomerCount(db, updated));
    }
  },
  {
    method: "patch",
    path: "/branches/:id/status",
    auth: true,
    handler: ({ params, body }) => {
      const db = getDatabase();
      const branch = findBranch(db, params.id);
      branch.activa = Boolean(body.activa);
      saveDatabase();
      return respond(withCustomerCount(db, branch));
    }
  },
  {
    method: "patch",
    path: "/branches/:id/position",
    auth: true,
    handler: ({ params, body }) => {
      const db = getDatabase();
      const branch = findBranch(db, params.id);
      branch.mapX = clampMapPoint(Number(body.mapX), 45, 955);
      branch.mapY = clampMapPoint(Number(body.mapY), 45, 655);
      Object.assign(branch, coordinatesFromMap(branch.distrito, branch.mapX, branch.mapY));
      saveDatabase();
      return respond(withCustomerCount(db, branch));
    }
  }
];
