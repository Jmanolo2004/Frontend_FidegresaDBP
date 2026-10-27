import { getDatabase, saveDatabase } from "../database";
import { badRequest, conflict, nextId, notFound, requireText, respond, toPage } from "../http";
import { getInitials, normalizeText } from "../../utils/format";

const DAY = 86400000;

function withLocal(db, customer) {
  const local = db.ubicaciones.find(place => Number(place.id) === Number(customer.localId));
  return {
    ...customer,
    localNombre: local?.nombre || customer.tarjeta || "Sin local",
    estado: Date.now() - new Date(customer.ultimaVisita).getTime() <= 60 * DAY ? "Activa" : "Inactiva"
  };
}

function filterCustomers(db, { search = "", status = "Todos" }) {
  const query = normalizeText(search.trim());
  const phoneQuery = query.replace(/\D/g, "");
  return db.clientes
    .map(customer => withLocal(db, customer))
    .filter(customer => {
      if (status !== "Todos" && customer.estado !== status) return false;
      const searchable = normalizeText(
        `${customer.nombre} ${customer.correo} ${customer.telefono} ${customer.tarjeta} ${customer.distrito} ${customer.localNombre}`
      );
      const phone = String(customer.telefono || "").replace(/\D/g, "");
      return !query || searchable.includes(query) || (phoneQuery.length >= 3 && phone.includes(phoneQuery));
    });
}

const sorters = {
  recent: (first, second) => new Date(second.ultimaVisita) - new Date(first.ultimaVisita),
  name: (first, second) => first.nombre.localeCompare(second.nombre, "es"),
  visits: (first, second) => second.visitas - first.visitas
};

export const customerHandlers = [
  {
    method: "get",
    path: "/customers",
    auth: true,
    handler: ({ query }) => {
      const db = getDatabase();
      const results = filterCustomers(db, query).sort(sorters[query.sort] || sorters.recent);
      return respond(toPage(results, query));
    }
  },
  {
    method: "get",
    path: "/customers/stats",
    auth: true,
    handler: () => {
      const db = getDatabase();
      const totalVisits = db.clientes.reduce((total, person) => total + Number(person.visitas || 0), 0);
      const active = db.clientes.filter(person => Date.now() - new Date(person.ultimaVisita).getTime() <= 60 * DAY).length;
      return respond({
        total: db.clientes.length,
        active,
        totalVisits,
        averageVisits: totalVisits / Math.max(1, db.clientes.length)
      });
    }
  },
  {
    method: "get",
    path: "/customers/:id",
    auth: true,
    handler: ({ params }) => {
      const db = getDatabase();
      const customer = db.clientes.find(item => Number(item.id) === Number(params.id));
      if (!customer) throw notFound("No encontramos a este cliente.");
      const visits = db.visitas
        .filter(visit => visit.clienteId === customer.id)
        .sort((first, second) => new Date(second.fecha) - new Date(first.fecha));
      const card = db.tarjetas.find(item => item.negocio === customer.tarjeta) || null;
      return respond({
        ...withLocal(db, customer),
        totalGastado: Number(visits.reduce((total, visit) => total + visit.monto, 0).toFixed(2)),
        visitasRecientes: visits.slice(0, 8),
        premiosCanjeados: visits.filter(visit => visit.premioCanjeado).length,
        tarjetaPrograma: card,
        resenas: db.resenas.filter(review => review.clienteId === customer.id)
      });
    }
  },
  {
    method: "post",
    path: "/customers",
    auth: true,
    handler: ({ body }) => {
      const db = getDatabase();
      const fullName = requireText(body.fullName, "El nombre es obligatorio");
      const email = requireText(body.email, "El email es obligatorio").toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw badRequest("Debe ser un formato de email válido");
      if (db.clientes.some(customer => customer.correo === email)) throw conflict("Ya existe un cliente con este correo.");
      const location = db.ubicaciones.find(place => Number(place.id) === Number(body.localId)) || db.ubicaciones[0];
      const now = new Date().toISOString();
      const customer = {
        id: nextId(db.clientes),
        nombre: fullName,
        correo: email,
        telefono: String(body.phone || "").trim(),
        tarjeta: location.nombre,
        localId: location.id,
        distrito: location.distrito,
        latitud: location.latitud,
        longitud: location.longitud,
        mapX: location.mapX + 30,
        mapY: location.mapY - 20,
        fechaRegistro: now,
        ultimaVisita: now,
        visitas: 0,
        estampillas: 0,
        saldoCashback: 0,
        cumpleanos: null,
        iniciales: getInitials(fullName),
        foto: null,
        estado: "Activa"
      };
      db.clientes.unshift(customer);
      saveDatabase();
      return respond(withLocal(db, customer), 201);
    }
  }
];
