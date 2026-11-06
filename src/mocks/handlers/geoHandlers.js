import { getDatabase, saveDatabase } from "../database";
import { badRequest, nextId, notFound, requireText, respond, toPage } from "../http";
import { distanceInMeters } from "../../utils/mapUtils";

const AUDIENCE_STATUSES = ["Borrador", "Programada", "Activa", "Pausada", "Finalizada"];
const CARD_TYPES = ["Estampillas", "Cashback", "Niveles", "Giftcard"];

function findBranch(db, id) {
  const branch = db.ubicaciones.find(item => Number(item.id) === Number(id));
  if (!branch) throw notFound("No encontramos este local.");
  return branch;
}

function audienceCenter(db, filters) {
  const branch = findBranch(db, filters.branchId || filters.ubicacionId);
  return {
    branch,
    center: {
      lat: Number(filters.latitud ?? filters.center?.lat ?? branch.latitud),
      lng: Number(filters.longitud ?? filters.center?.lng ?? branch.longitud)
    }
  };
}

function matchesFilters(customer, filters) {
  const lastVisitDays = Math.floor((Date.now() - new Date(customer.ultimaVisita).getTime()) / 86400000);
  const activity = filters.activity || filters.actividad || "todos";
  if (activity === "activos" && lastVisitDays > 30) return false;
  if (activity === "inactivos30" && lastVisitDays <= 30) return false;
  if (activity === "inactivos60" && lastVisitDays <= 60) return false;
  if (activity === "inactivos90" && lastVisitDays <= 90) return false;
  if (filters.cardType && filters.cardType !== "Todas" && customer.tipoTarjeta !== filters.cardType) return false;
  if (filters.minimumVisits && customer.visitas < Number(filters.minimumVisits)) return false;
  if (filters.birthdayThisMonth && Number(customer.cumpleanos?.split("/")[1]) !== new Date().getMonth() + 1) return false;
  return true;
}

function getMatchingCustomers(db, filters) {
  const { branch, center } = audienceCenter(db, filters);
  const candidates = db.clientes.filter(customer => {
    if (Number(customer.localId) !== Number(branch.id)) return false;
    if ((filters.zoneType || filters.tipoZona) === "district") {
      const district = filters.district || filters.distrito || branch.distrito;
      if (customer.lastKnownZone !== district) return false;
    } else {
      const distance = distanceInMeters(center, { lat: customer.latitud, lng: customer.longitud });
      if (distance > Math.max(100, Number(filters.radius ?? filters.radio) || 500)) return false;
    }
    if (!matchesFilters(customer, filters)) return false;
    if (filters.closeToReward) {
      if (customer.tipoTarjeta !== "Estampillas") return false;
      const card = db.tarjetas.find(item => item.negocio === branch.nombre && item.tipo === "Estampillas");
      const target = Number(card?.reglas?.sellosMeta) || 10;
      const remaining = target - Number(customer.estampillas || 0);
      if (remaining < 1 || remaining > 2) return false;
    }
    return true;
  }).map(customer => ({
    ...customer,
    distance: Math.round(distanceInMeters(center, { lat: customer.latitud, lng: customer.longitud }))
  }));
  const eligible = candidates.filter(customer => customer.consentimientoUbicacion && customer.notificacionesActivas);
  return { branch, center, candidates, eligible, excluded: candidates.length - eligible.length };
}

function prepareAudience(db, body, current = null) {
  const nombre = requireText(body.nombre, "Escribe un nombre para la audiencia.").slice(0, 60);
  const titulo = requireText(body.message?.title ?? body.titulo, "Escribe el título de la notificación.").slice(0, 40);
  const mensaje = requireText(body.message?.text ?? body.mensaje, "Escribe el mensaje de la notificación.").slice(0, 140);
  const status = body.estado || "Borrador";
  if (!AUDIENCE_STATUSES.includes(status)) throw badRequest("Selecciona un estado de audiencia válido.");
  if (!["geofence", "scheduled", "geocerca", "programado"].includes(body.trigger || body.disparo || "geofence")) throw badRequest("Selecciona un tipo de disparo válido.");
  const filters = body.filters || body.segmento || {};
  const radius = Number(body.radius ?? body.radio ?? 500);
  if (!Number.isFinite(radius) || radius < 100 || radius > 3000) throw badRequest("El radio debe estar entre 100 m y 3 km.");
  const branchId = Number(body.branchId ?? body.ubicacionId);
  const { branch, center } = audienceCenter(db, { branchId, latitud: body.latitud, longitud: body.longitud, center: body.center });
  const matches = getMatchingCustomers(db, { ...filters, branchId, center, radius, zoneType: body.zoneType || body.tipoZona, district: body.district || body.distrito });
  if (!matches.eligible.length && status !== "Borrador") throw badRequest("No hay clientes con consentimiento y notificaciones activas en este segmento.");
  return {
    ...(current || {}),
    id: current?.id ?? nextId(db.audiencias || []),
    nombre,
    branchId,
    ubicacionId: branchId,
    local: branch.nombre,
    radius,
    radio: radius,
    center,
    latitud: center.lat,
    longitud: center.lng,
    zoneType: body.zoneType || body.tipoZona || "radius",
    district: body.district || body.distrito || branch.distrito,
    filters,
    segmento: filters,
    message: { title: titulo, text: mensaje, action: body.message?.action || body.botonAccion || "" },
    titulo,
    mensaje,
    trigger: body.trigger || body.disparo || "geofence",
    disparo: body.trigger || body.disparo || "geofence",
    schedule: body.schedule || body.programacion || {},
    programacion: body.schedule || body.programacion || {},
    estado: status,
    clientes: matches.eligible.map(customer => customer.id),
    personas: matches.eligible.length,
    excluidosSinConsentimiento: matches.excluded,
    envios: current?.envios || [],
    creadaEn: current?.creadaEn || new Date().toISOString(),
    actualizadaEn: new Date().toISOString()
  };
}

function simulateSends(db, audience) {
  const matches = getMatchingCustomers(db, {
    branchId: audience.branchId,
    center: audience.center,
    radius: audience.radius,
    zoneType: audience.zoneType,
    district: audience.district,
    ...audience.filters
  });
  const now = new Date();
  const sendTime = now.toISOString();
  audience.clientes = matches.eligible.map(customer => customer.id);
  audience.personas = matches.eligible.length;
  audience.excluidosSinConsentimiento = matches.excluded;
  audience.envios = matches.eligible.map((customer, index) => {
    const sentAt = new Date(now.getTime() - index * 60000).toISOString();
    const opened = index % 3 !== 0;
    const returned = index % 4 === 0;
    return {
      id: `${audience.id}-${Date.now()}-${index}`,
      fecha: sentAt,
      clienteId: customer.id,
      cliente: customer.nombre,
      local: audience.local,
      abierto: opened,
      volvio: returned,
      venta: returned ? Number((32 + (customer.visitas % 9) * 7.5).toFixed(2)) : 0
    };
  });
  audience.ultimoEnvio = sendTime;
  audience.metricas = calculateMetrics(audience);
}

function calculateMetrics(audience) {
  const sends = audience.envios || [];
  const opened = sends.filter(item => item.abierto).length;
  const attributed = sends.filter(item => item.volvio);
  return {
    personas: audience.personas || audience.clientes?.length || 0,
    avisosEnviados: sends.length,
    abiertos: sends.length ? Math.round((opened / sends.length) * 100) : 0,
    visitasAtribuidas: attributed.length,
    ventasAtribuidas: Number(attributed.reduce((sum, item) => sum + Number(item.venta || 0), 0).toFixed(2))
  };
}

export const geoHandlers = [
  {
    method: "get",
    path: "/geo/customers",
    auth: true,
    handler: ({ query }) => {
      const db = getDatabase();
      const branchId = query.branchId ? Number(query.branchId) : null;
      const branch = branchId ? findBranch(db, branchId) : db.ubicaciones[0];
      const center = { lat: Number(branch.latitud), lng: Number(branch.longitud) };
      return respond(db.clientes.map(customer => ({
        ...customer,
        distance: Math.round(distanceInMeters(center, { lat: customer.latitud, lng: customer.longitud }))
      })).filter(customer =>
        (!branchId || Number(customer.localId) === branchId) &&
        (!query.radius || customer.distance <= Number(query.radius))
      ));
    }
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
        if (!Number.isFinite(radius) || radius < 100 || radius > 3000) throw badRequest("El radio debe estar entre 100 m y 3 km.");
        db.geolocalizacion.radio = radius;
      }
      if (body.ubicacionId !== undefined) {
        findBranch(db, body.ubicacionId);
        db.geolocalizacion.ubicacionId = Number(body.ubicacionId);
      }
      saveDatabase();
      return respond(db.geolocalizacion);
    }
  },
  {
    method: "get",
    path: "/audiences",
    auth: true,
    handler: ({ query }) => {
      const db = getDatabase();
      const audiences = (db.audiencias || []).filter(audience =>
        (!query.status || query.status === "Todos" || audience.estado === query.status) &&
        (!query.q || audience.nombre.toLowerCase().includes(String(query.q).trim().toLowerCase()) || audience.local.toLowerCase().includes(String(query.q).trim().toLowerCase()))
      ).sort((first, second) => new Date(second.actualizadaEn) - new Date(first.actualizadaEn));
      const content = toPage(audiences, query);
      content.content = content.content.map(audience => ({ ...audience, metricas: calculateMetrics(audience) }));
      return respond(content);
    }
  },
  {
    method: "post",
    path: "/audiences/preview",
    auth: true,
    handler: ({ body }) => {
      const db = getDatabase();
      const matches = getMatchingCustomers(db, body);
      return respond({
        total: matches.eligible.length,
        excluidosSinConsentimiento: matches.excluded,
        clientes: matches.eligible.slice(0, 12).map(customer => ({
          id: customer.id,
          nombre: customer.nombre,
          distrito: customer.lastKnownZone,
          distancia: Math.round(distanceInMeters(matches.center, { lat: customer.latitud, lng: customer.longitud })),
          visitas: customer.visitas,
          tipoTarjeta: customer.tipoTarjeta
        }))
      });
    }
  },
  {
    method: "post",
    path: "/audiences",
    auth: true,
    handler: ({ body }) => {
      const db = getDatabase();
      const audience = prepareAudience(db, body);
      if (audience.estado === "Activa" || audience.estado === "Programada") {
        if (audience.estado === "Activa") simulateSends(db, audience);
      }
      db.audiencias = [audience, ...(db.audiencias || [])];
      saveDatabase();
      return respond(audience, 201);
    }
  },
  {
    method: "get",
    path: "/audiences/:id",
    auth: true,
    handler: ({ params }) => {
      const db = getDatabase();
      const audience = (db.audiencias || []).find(item => Number(item.id) === Number(params.id));
      if (!audience) throw notFound("No encontramos esta audiencia.");
      const matches = getMatchingCustomers(db, {
        branchId: audience.branchId,
        center: audience.center,
        radius: audience.radius,
        zoneType: audience.zoneType,
        district: audience.district,
        ...audience.filters
      });
      const daily = Array.from({ length: 7 }, (_, index) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - index));
        const label = date.toLocaleDateString("es-PE", { weekday: "short", day: "numeric" });
        const value = (audience.envios || []).filter(send => new Date(send.fecha).toDateString() === date.toDateString()).length;
        return { label, short: label.slice(0, 3), value };
      });
      return respond({
        ...audience,
        metricas: calculateMetrics(audience),
        clientesAlcanzados: matches.eligible,
        historial: audience.envios || [],
        actividadDiaria: daily
      });
    }
  },
  {
    method: "put",
    path: "/audiences/:id",
    auth: true,
    handler: ({ params, body }) => {
      const db = getDatabase();
      const current = (db.audiencias || []).find(item => Number(item.id) === Number(params.id));
      if (!current) throw notFound("No encontramos esta audiencia.");
      if (current.estado === "Activa" || current.estado === "Finalizada") throw badRequest("Pausa o finaliza la audiencia antes de editarla.");
      const audience = prepareAudience(db, body, current);
      db.audiencias = db.audiencias.map(item => item.id === current.id ? audience : item);
      saveDatabase();
      return respond(audience);
    }
  },
  {
    method: "patch",
    path: "/audiences/:id/status",
    auth: true,
    handler: ({ params, body }) => {
      const db = getDatabase();
      const audience = (db.audiencias || []).find(item => Number(item.id) === Number(params.id));
      if (!audience) throw notFound("No encontramos esta audiencia.");
      const status = body.estado;
      if (!AUDIENCE_STATUSES.includes(status)) throw badRequest("Selecciona un estado de audiencia válido.");
      if (status === "Activa") simulateSends(db, audience);
      audience.estado = status;
      audience.actualizadaEn = new Date().toISOString();
      saveDatabase();
      return respond({ ...audience, metricas: calculateMetrics(audience) });
    }
  },
  {
    method: "post",
    path: "/audiences/:id/test",
    auth: true,
    handler: ({ params, user }) => {
      const db = getDatabase();
      const audience = (db.audiencias || []).find(item => Number(item.id) === Number(params.id));
      if (!audience) throw notFound("No encontramos esta audiencia.");
      audience.ultimaPrueba = new Date().toISOString();
      saveDatabase();
      return respond({ enviado: true, destinatario: user?.email || "maria@fidegresa.com", fecha: audience.ultimaPrueba });
    }
  },
  {
    method: "post",
    path: "/audiences/:id/duplicate",
    auth: true,
    handler: ({ params }) => {
      const db = getDatabase();
      const original = (db.audiencias || []).find(item => Number(item.id) === Number(params.id));
      if (!original) throw notFound("No encontramos esta audiencia.");
      const duplicate = {
        ...original,
        id: nextId(db.audiencias),
        nombre: `${original.nombre} (copia)`,
        estado: "Borrador",
        envios: [],
        ultimoEnvio: null,
        metricas: calculateMetrics({ ...original, envios: [] }),
        creadaEn: new Date().toISOString(),
        actualizadaEn: new Date().toISOString()
      };
      db.audiencias.unshift(duplicate);
      saveDatabase();
      return respond(duplicate, 201);
    }
  },
  {
    method: "delete",
    path: "/audiences/:id",
    auth: true,
    handler: ({ params }) => {
      const db = getDatabase();
      if (!(db.audiencias || []).some(item => Number(item.id) === Number(params.id))) throw notFound("No encontramos esta audiencia.");
      db.audiencias = db.audiencias.filter(item => Number(item.id) !== Number(params.id));
      saveDatabase();
      return respond({ deleted: true });
    }
  }
];
