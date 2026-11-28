import { getDatabase, saveDatabase } from "../database";
import { badRequest, conflict, notFound, respond, toPage } from "../http";

// Segmentos y promociones en modo demo (misma forma que SegmentService y PromotionService del backend).
const DAY = 24 * 60 * 60 * 1000;
const SETTINGS = { newDays: 14, loyalVisits: 4, loyalDays: 60, atRiskVisits: 2, atRiskDays: 30 };
const LABELS = { ALL: "Todos", LOYAL: "Fieles", AT_RISK: "En riesgo", NEW: "Nuevos", BIRTHDAY: "Cumpleañeros del mes" };
const DESCRIPTIONS = {
  ALL: () => "Todos tus clientes.",
  NEW: s => `Se unieron en los últimos ${s.newDays} días.`,
  LOYAL: s => `${s.loyalVisits} o más visitas en los últimos ${s.loyalDays} días.`,
  AT_RISK: s => `${s.atRiskVisits} o más visitas, pero ninguna en los últimos ${s.atRiskDays} días.`,
  BIRTHDAY: () => "Cumplen años este mes."
};

function parseSegment(value) {
  const key = String(value || "").trim().toUpperCase().replace(/[- ]/g, "_");
  if (!LABELS[key]) throw badRequest("El segmento debe ser ALL, LOYAL, AT_RISK, NEW, BIRTHDAY o LIST.");
  return key;
}

/** Clientes de un segmento, calculados con las visitas guardadas en el demo. */
function customersIn(db, segment, programId) {
  const now = Date.now();
  const program = programId ? db.tarjetas.find(card => Number(card.id) === Number(programId)) : null;
  const visitsBy = {};
  db.visitas.forEach(visit => {
    (visitsBy[visit.clienteId] = visitsBy[visit.clienteId] || []).push(new Date(visit.fecha).getTime());
  });
  const month = String(new Date().getMonth() + 1).padStart(2, "0");
  return db.clientes.filter(customer => {
    if (program && customer.tarjeta !== program.negocio) return false;
    const visits = visitsBy[customer.id] || [];
    const last = visits.length ? Math.max(...visits) : 0;
    switch (segment) {
      case "LOYAL": return visits.filter(time => now - time <= SETTINGS.loyalDays * DAY).length >= SETTINGS.loyalVisits;
      case "AT_RISK": return visits.length >= SETTINGS.atRiskVisits && now - last > SETTINGS.atRiskDays * DAY;
      case "NEW": return now - new Date(customer.fechaRegistro).getTime() <= SETTINGS.newDays * DAY;
      case "BIRTHDAY": return String(customer.cumpleanos || "").slice(3, 5) === month;
      default: return true;
    }
  });
}

// En el demo, unos 3 de cada 4 clientes tienen la tarjeta guardada en Google Wallet.
const withWallet = (db, list) => list.filter(customer => customer.notificacionesActivas || Number(customer.id) % 4 !== 0).length;

export const segmentHandlers = [
  {
    method: "get",
    path: "/segments",
    auth: true,
    handler: () => {
      const db = getDatabase();
      return respond(Object.keys(LABELS).map(key => {
        const list = customersIn(db, key);
        return { key, label: LABELS[key], description: DESCRIPTIONS[key](SETTINGS), customers: list.length, emailable: list.filter(item => item.correo).length };
      }));
    }
  },
  {
    method: "get",
    path: "/segments/settings",
    auth: true,
    handler: () => respond({ ...SETTINGS })
  },
  {
    method: "get",
    path: "/segments/:key/customers",
    auth: true,
    handler: ({ params, query }) => {
      const db = getDatabase();
      const list = customersIn(db, parseSegment(params.key)).sort((a, b) => a.id - b.id);
      const page = toPage(list, query);
      return respond({
        ...page,
        content: page.content.map(customer => ({
          id: customer.id,
          fullName: customer.nombre,
          email: customer.correo,
          phone: customer.telefono,
          birthday: customer.cumpleanos,
          registeredAt: customer.fechaRegistro,
          emailable: Boolean(customer.correo)
        }))
      });
    }
  }
];

function promotionsOf(db) {
  db.promociones = db.promociones || [];
  return db.promociones;
}

function status(promotion) {
  const today = new Date().toISOString().slice(0, 10);
  if (promotion.endsOn < today) return "EXPIRED";
  if (!promotion.active) return "PAUSED";
  if (promotion.startsOn > today) return "SCHEDULED";
  return "LIVE";
}

const discountLabel = promotion =>
  promotion.discountType === "PERCENT" ? `${Number(promotion.discountValue)} %` : `S/ ${Number(promotion.discountValue).toFixed(2)}`;

function toResponse(db, promotion) {
  const program = promotion.programId ? db.tarjetas.find(card => Number(card.id) === Number(promotion.programId)) : null;
  return {
    ...promotion,
    discountLabel: discountLabel(promotion),
    programName: program?.nombre ?? null,
    segmentLabel: LABELS[promotion.segment],
    status: status(promotion),
    redemptions: 0,
    discountTotal: 0
  };
}

function validate(body) {
  const name = String(body.name || "").trim();
  if (!name) throw badRequest("Escribe el nombre de la promoción.");
  if (name.length > 80) throw badRequest("El nombre puede tener hasta 80 caracteres.");
  const description = String(body.description || "").trim();
  if (description.length > 240) throw badRequest("La descripción puede tener hasta 240 caracteres.");
  const type = String(body.discountType || "").toUpperCase();
  if (type !== "PERCENT" && type !== "AMOUNT") throw badRequest("El tipo de descuento debe ser PERCENT o AMOUNT.");
  const value = Number(body.discountValue);
  if (!(value > 0)) throw badRequest("El descuento debe ser mayor que cero.");
  if (type === "PERCENT" && value >= 100) throw badRequest("El porcentaje debe estar entre 0 y 100.");
  if (type === "AMOUNT" && value > 10000) throw badRequest("El descuento puede ser de hasta S/ 10000.00.");
  if (!body.startsOn || !body.endsOn) throw badRequest("Indica las fechas de inicio y fin.");
  if (body.endsOn < body.startsOn) throw badRequest("La fecha de fin debe ser igual o posterior a la de inicio.");
  if ((new Date(body.endsOn) - new Date(body.startsOn)) / DAY > 366) throw badRequest("La promoción puede durar hasta un año.");
  if (body.endsOn < new Date().toISOString().slice(0, 10)) throw badRequest("La fecha de fin ya pasó.");
  return { name, description: description || null, discountType: type, discountValue: Number(value.toFixed(2)) };
}

export const promotionHandlers = [
  {
    method: "get",
    path: "/promotions",
    auth: true,
    handler: ({ query }) => {
      const db = getDatabase();
      const list = [...promotionsOf(db)].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      const page = toPage(list, query);
      return respond({ ...page, content: page.content.map(item => toResponse(db, item)) });
    }
  },
  {
    method: "post",
    path: "/promotions/audience",
    auth: true,
    handler: ({ body }) => {
      const db = getDatabase();
      const segment = parseSegment(body.segment);
      if (body.programId && !db.tarjetas.some(card => Number(card.id) === Number(body.programId))) throw notFound("Tarjeta no encontrada.");
      const list = customersIn(db, segment, body.programId);
      return respond({ segment, segmentLabel: LABELS[segment], customers: list.length, withWallet: withWallet(db, list) });
    }
  },
  {
    method: "post",
    path: "/promotions",
    auth: true,
    handler: ({ body }) => {
      const db = getDatabase();
      const segment = parseSegment(body.segment);
      const fields = validate(body);
      if (body.programId && !db.tarjetas.some(card => Number(card.id) === Number(body.programId))) throw notFound("Tarjeta no encontrada.");
      const audience = customersIn(db, segment, body.programId);
      const now = new Date().toISOString();
      const promotion = {
        id: Math.max(0, ...promotionsOf(db).map(item => item.id)) + 1,
        ...fields,
        programId: body.programId ? Number(body.programId) : null,
        segment,
        startsOn: body.startsOn,
        endsOn: body.endsOn,
        active: body.active !== false,
        createdAt: now,
        updatedAt: now
      };
      const live = status(promotion) === "LIVE";
      promotion.launchedAt = live ? now : null;
      promotion.recipients = live ? audience.length : 0;
      promotion.notified = live ? withWallet(db, audience) : 0;
      promotionsOf(db).push(promotion);
      saveDatabase();
      return respond(toResponse(db, promotion), 201);
    }
  },
  {
    method: "patch",
    path: "/promotions/:id/status",
    auth: true,
    handler: ({ params, body }) => {
      const db = getDatabase();
      const promotion = promotionsOf(db).find(item => item.id === Number(params.id));
      if (!promotion) throw notFound("Promoción no encontrada.");
      if (body.active == null) throw badRequest("Indica active: true o false.");
      if (body.active && status(promotion) === "EXPIRED") throw conflict("La promoción ya terminó. Cambia la fecha de fin para volver a activarla.");
      promotion.active = Boolean(body.active);
      promotion.updatedAt = new Date().toISOString();
      saveDatabase();
      return respond(toResponse(db, promotion));
    }
  }
];
