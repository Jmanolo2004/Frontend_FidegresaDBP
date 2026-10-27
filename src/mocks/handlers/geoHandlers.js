import { getDatabase, saveDatabase } from "../database";
import { badRequest, notFound, respond } from "../http";

export const geoHandlers = [
  {
    method: "get",
    path: "/geo/customers",
    auth: true,
    handler: () =>
      respond(
        getDatabase().clientes.map(({ id, nombre, iniciales, distrito, latitud, longitud, mapX, mapY }) => ({
          id,
          nombre,
          iniciales,
          distrito,
          latitud,
          longitud,
          mapX,
          mapY
        }))
      )
  },
  {
    method: "get",
    path: "/geo/settings",
    auth: true,
    handler: () => respond(getDatabase().geolocalizacion)
  },
  {
    method: "patch",
    path: "/geo/settings",
    auth: true,
    handler: ({ body }) => {
      const db = getDatabase();
      if (body.radio !== undefined) {
        const radius = Number(body.radio);
        if (!Number.isFinite(radius) || radius < 100 || radius > 1000) throw badRequest("El radio debe estar entre 100 y 1000 metros.");
        db.geolocalizacion.radio = radius;
      }
      if (body.ubicacionId !== undefined) {
        if (!db.ubicaciones.some(place => Number(place.id) === Number(body.ubicacionId))) throw notFound("No encontramos esta ubicación.");
        db.geolocalizacion.ubicacionId = Number(body.ubicacionId);
      }
      saveDatabase();
      return respond(db.geolocalizacion);
    }
  },
  {
    method: "post",
    path: "/geo/audiences",
    auth: true,
    handler: ({ body }) => {
      const db = getDatabase();
      const message = String(body.mensaje || "").trim();
      if (!Array.isArray(body.clientes) || !body.clientes.length) throw badRequest("Amplía el radio para incluir clientes antes de enviar.");
      if (!message) throw badRequest("Escribe un mensaje para la audiencia.");
      if (message.length > 240) throw badRequest("El mensaje puede tener hasta 240 caracteres.");
      const audience = {
        id: Date.now(),
        ubicacionId: Number(body.ubicacionId),
        radio: Number(body.radio),
        clientes: body.clientes.map(Number),
        mensaje: message,
        fecha: new Date().toISOString()
      };
      db.audiencias = [audience, ...(db.audiencias || [])];
      saveDatabase();
      return respond(audience, 201);
    }
  }
];
