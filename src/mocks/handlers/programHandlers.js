import { getDatabase, saveDatabase } from "../database";
import { badRequest, nextId, notFound, requireText, respond, toPage } from "../http";
import { CARD_TYPES } from "../../utils/constants";
import { normalizeText } from "../../utils/format";

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const IMAGE_DATA = /^data:image\/(?:png|jpeg|webp);base64,/i;
const CARD_STATUSES = ["Activa", "En pausa", "Borrador"];
const CARD_STYLES = ["elegante", "minimal", "vibrante"];
const DEFAULT_COLORS = { primario: "#603f2a", acento: "#c8894f" };

function assertNumber(value, min, max, message, integer = true) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max || (integer && !Number.isInteger(number))) {
    throw badRequest(message);
  }
  return number;
}

function sanitizeRules(tipo, rules = {}) {
  if (!rules || typeof rules !== "object" || Array.isArray(rules)) throw badRequest("Revisa las reglas de la tarjeta.");
  if (tipo === "Estampillas") {
    const selloPor = ["visita", "compra mínima"].includes(rules.selloPor) ? rules.selloPor : null;
    if (!selloPor) throw badRequest("Elige si entregarás sellos por visita o por compra mínima.");
    const iconoSello = ["star", "reward", "card"].includes(rules.iconoSello) ? rules.iconoSello : "star";
    return {
      sellosMeta: assertNumber(rules.sellosMeta, 4, 12, "La meta debe tener entre 4 y 12 sellos."),
      premio: requireText(rules.premio, "Escribe el premio de la tarjeta.").slice(0, 100),
      iconoSello,
      selloPor,
      montoMinimo: assertNumber(rules.montoMinimo, 0, 100000, "El monto mínimo debe ser igual o mayor que cero.", false),
      limitePorDia: assertNumber(rules.limitePorDia, 1, 20, "El límite diario debe estar entre 1 y 20.")
    };
  }
  if (tipo === "Cashback") {
    return {
      porcentaje: assertNumber(rules.porcentaje, 1, 30, "El cashback debe estar entre 1% y 30%.", false),
      topeMensual: assertNumber(rules.topeMensual, 0, 100000, "El tope mensual debe ser igual o mayor que cero.", false),
      saldoMinimoCanje: assertNumber(rules.saldoMinimoCanje, 0, 100000, "El saldo mínimo de canje debe ser igual o mayor que cero.", false),
      expiraDias: assertNumber(rules.expiraDias, 1, 3650, "La vigencia del saldo debe estar entre 1 y 3650 días.")
    };
  }
  if (tipo === "Niveles") {
    if (!Array.isArray(rules.niveles) || rules.niveles.length < 3 || rules.niveles.length > 5) {
      throw badRequest("Define entre 3 y 5 niveles para el programa.");
    }
    let previousPoints = -1;
    const niveles = rules.niveles.map(level => {
      if (!level || typeof level !== "object" || Array.isArray(level)) throw badRequest("Revisa los datos de cada nivel.");
      const desdePuntos = assertNumber(level.desdePuntos, 0, 10000000, "Los puntos de cada nivel deben ser positivos.");
      if (desdePuntos <= previousPoints) throw badRequest("Los niveles deben ordenarse por puntos de menor a mayor.");
      previousPoints = desdePuntos;
      const color = HEX_COLOR.test(level.color || "") ? level.color : DEFAULT_COLORS.acento;
      return {
        nombre: requireText(level.nombre, "Cada nivel necesita un nombre.").slice(0, 30),
        desdePuntos,
        beneficio: requireText(level.beneficio, "Cada nivel necesita un beneficio.").slice(0, 100),
        color
      };
    });
    return {
      niveles,
      puntosPorSol: assertNumber(rules.puntosPorSol, 1, 1000, "Los puntos por sol deben estar entre 1 y 1000.", false)
    };
  }
  if (tipo === "Giftcard") {
    const montos = Array.isArray(rules.montos)
      ? rules.montos.map(amount => assertNumber(amount, 1, 100000, "Cada monto debe ser mayor que cero.", false))
      : [];
    if (!montos.length || new Set(montos).size !== montos.length) throw badRequest("Agrega montos de gift card distintos.");
    const montoMin = assertNumber(rules.montoMin, 1, 100000, "El monto mínimo debe ser mayor que cero.", false);
    const montoMax = assertNumber(rules.montoMax, montoMin, 100000, "El monto máximo no puede ser menor al mínimo.", false);
    if (montos.some(amount => amount < montoMin || amount > montoMax)) {
      throw badRequest("Los montos predefinidos deben estar dentro del mínimo y máximo.");
    }
    return {
      montos,
      permiteMontoLibre: Boolean(rules.permiteMontoLibre),
      montoMin,
      montoMax,
      vigenciaMeses: assertNumber(rules.vigenciaMeses, 1, 120, "La vigencia debe estar entre 1 y 120 meses."),
      mensajeRegalo: requireText(rules.mensajeRegalo, "Escribe el mensaje de regalo.").slice(0, 120)
    };
  }
  throw badRequest("El tipo de tarjeta no es válido.");
}

function sanitizeProgram(body, db, current = {}) {
  const tipo = CARD_TYPES.includes(body.tipo || current.tipo) ? body.tipo || current.tipo : null;
  if (!tipo) throw badRequest("Elige un tipo de tarjeta válido.");
  const negocio = requireText(body.negocio ?? current.negocio, "Elige el local asociado.");
  if (!db.ubicaciones.some(place => place.nombre === negocio)) throw badRequest("El local asociado no existe.");

  const image = body.imagen === undefined ? current.imagen || null : body.imagen;
  if (image !== null && image !== "" && (typeof image !== "string" || !IMAGE_DATA.test(image))) {
    throw badRequest("El logo debe ser una imagen PNG, JPG o WebP válida.");
  }
  if (image && image.length > 700000) throw badRequest("La imagen debe pesar 500 KB o menos.");

  const inputColors = body.colores ?? current.colores ?? DEFAULT_COLORS;
  if (!HEX_COLOR.test(inputColors.primario || "") || !HEX_COLOR.test(inputColors.acento || "")) {
    throw badRequest("Usa códigos de color válidos para personalizar la tarjeta.");
  }
  const estilo = body.estilo ?? current.estilo ?? "elegante";
  if (!CARD_STYLES.includes(estilo)) throw badRequest("El estilo de tarjeta no es válido.");
  const estado = body.estado ?? current.estado ?? "Activa";
  if (!CARD_STATUSES.includes(estado)) throw badRequest("El estado de la tarjeta no es válido.");
  const vigenciaMeses = assertNumber(body.vigenciaMeses ?? current.vigenciaMeses ?? 12, 1, 120, "La vigencia debe estar entre 1 y 120 meses.");

  return {
    nombre: requireText(body.nombre ?? current.nombre, "Escribe el nombre de la tarjeta.").slice(0, 50),
    tipo,
    negocio,
    descripcion: String(body.descripcion ?? current.descripcion ?? "").trim().slice(0, 160),
    colores: { primario: inputColors.primario, acento: inputColors.acento },
    estilo,
    imagen: image || null,
    estado,
    vigenciaMeses,
    terminos: String(body.terminos ?? current.terminos ?? "").trim().slice(0, 2000),
    reglas: sanitizeRules(tipo, body.reglas ?? current.reglas),
    creadaEn: current.creadaEn || new Date().toISOString(),
    actualizadaEn: new Date().toISOString()
  };
}

function findProgram(db, id) {
  const program = db.tarjetas.find(item => Number(item.id) === Number(id));
  if (!program) throw notFound("No encontramos esta tarjeta.");
  return program;
}

function clientsForProgram(db, program) {
  const location = db.ubicaciones.find(item => item.nombre === program.negocio);
  return location ? db.clientes.filter(customer => Number(customer.localId) === Number(location.id)) : [];
}

function withMetrics(db, program) {
  const customers = clientsForProgram(db, program);
  const customerIds = new Set(customers.map(customer => customer.id));
  const visits = db.visitas.filter(visit => customerIds.has(visit.clienteId));
  const redemptions = visits
    .filter(visit => visit.premioCanjeado)
    .sort((first, second) => new Date(second.fecha) - new Date(first.fecha))
    .slice(0, 5)
    .map(visit => {
      const customer = db.clientes.find(item => item.id === visit.clienteId);
      return { id: visit.id, clienteId: visit.clienteId, cliente: customer?.nombre || "Cliente", fecha: visit.fecha, monto: visit.monto };
    });
  const active = customers.filter(customer => Date.now() - new Date(customer.ultimaVisita).getTime() <= 60 * 86400000).length;
  const totalRedemptions = visits.filter(visit => visit.premioCanjeado).length;
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthlyRedemptions = visits.filter(visit => visit.premioCanjeado && new Date(visit.fecha) >= monthStart).length;
  const progressValues = customers.map(customer => {
    if (program.tipo === "Estampillas") return Math.min(100, (Number(customer.estampillas || 0) / program.reglas.sellosMeta) * 100);
    if (program.tipo === "Cashback") return Math.min(100, (Number(customer.saldoCashback || 0) / Math.max(1, program.reglas.saldoMinimoCanje)) * 100);
    if (program.tipo === "Niveles") {
      const points = Number(customer.visitas || 0) * program.reglas.puntosPorSol;
      const lastLevel = program.reglas.niveles.at(-1)?.desdePuntos || 1;
      return Math.min(100, (points / Math.max(1, lastLevel)) * 100);
    }
    return Math.min(100, (Number(customer.visitas || 0) / 10) * 100);
  });
  const colors = program.colores || DEFAULT_COLORS;
  return {
    ...program,
    color: colors.primario,
    colorAcento: colors.acento,
    estampillas: program.reglas?.sellosMeta || 10,
    porcentaje: program.reglas?.porcentaje || 5,
    niveles: program.reglas?.niveles?.length || 3,
    saldo: program.reglas?.montos?.[0] || 100,
    premio: program.reglas?.premio || program.reglas?.niveles?.at(-1)?.beneficio || program.descripcion,
    mostrarProgreso: true,
    mostrarQr: false,
    metricas: {
      clientesActivos: active,
      emitidas: customers.length,
      canjes: totalRedemptions,
      canjesMes: monthlyRedemptions,
      tasaCanje: visits.length ? Number(((totalRedemptions / visits.length) * 100).toFixed(1)) : 0,
      ventasAsociadas: Number(visits.reduce((total, visit) => total + Number(visit.monto || 0), 0).toFixed(2)),
      progresoPromedio: progressValues.length ? Number((progressValues.reduce((total, value) => total + value, 0) / progressValues.length).toFixed(1)) : 0,
      ultimosCanjes: redemptions
    }
  };
}

export const programHandlers = [
  {
    method: "get",
    path: "/loyalty-programs",
    auth: true,
    handler: ({ query }) => {
      const db = getDatabase();
      const type = query.type && query.type !== "Todas" ? query.type : null;
      const status = query.status && query.status !== "Todos" ? query.status : null;
      if (type && !CARD_TYPES.includes(type)) throw badRequest("El tipo de tarjeta no es válido.");
      if (status && !CARD_STATUSES.includes(status)) throw badRequest("El estado de la tarjeta no es válido.");
      const search = normalizeText(String(query.search || "").trim());
      const programs = db.tarjetas.filter(card =>
        (!type || card.tipo === type) &&
        (!status || card.estado === status) &&
        (!search || normalizeText(`${card.nombre} ${card.negocio}`).includes(search))
      );
      return respond(programs.map(card => withMetrics(db, card)));
    }
  },
  {
    method: "get",
    path: "/loyalty-programs/:id/customers",
    auth: true,
    handler: ({ params, query }) => {
      const db = getDatabase();
      const program = findProgram(db, params.id);
      const customers = clientsForProgram(db, program)
        .sort((first, second) => new Date(second.ultimaVisita) - new Date(first.ultimaVisita))
        .map(customer => ({
          id: customer.id,
          nombre: customer.nombre,
          iniciales: customer.iniciales,
          correo: customer.correo,
          progreso: program.tipo === "Estampillas"
            ? `${Math.min(customer.estampillas || 0, program.reglas.sellosMeta)} / ${program.reglas.sellosMeta} sellos`
            : program.tipo === "Cashback"
              ? `Saldo ${Number(customer.saldoCashback || 0).toFixed(2)}`
              : `${Number(customer.visitas || 0) * program.reglas.puntosPorSol} puntos`,
          ultimaVisita: customer.ultimaVisita
        }));
      return respond(toPage(customers, query));
    }
  },
  {
    method: "get",
    path: "/loyalty-programs/:id",
    auth: true,
    handler: ({ params }) => {
      const db = getDatabase();
      return respond(withMetrics(db, findProgram(db, params.id)));
    }
  },
  {
    method: "post",
    path: "/loyalty-programs",
    auth: true,
    handler: ({ body }) => {
      const db = getDatabase();
      const program = { id: nextId(db.tarjetas), ...sanitizeProgram(body, db) };
      db.tarjetas.unshift(program);
      saveDatabase();
      return respond(withMetrics(db, program), 201);
    }
  },
  {
    method: "put",
    path: "/loyalty-programs/:id",
    auth: true,
    handler: ({ params, body }) => {
      const db = getDatabase();
      const current = findProgram(db, params.id);
      const updated = { id: current.id, ...sanitizeProgram(body, db, current) };
      db.tarjetas = db.tarjetas.map(item => (item.id === current.id ? updated : item));
      saveDatabase();
      return respond(withMetrics(db, updated));
    }
  },
  {
    method: "patch",
    path: "/loyalty-programs/:id/status",
    auth: true,
    handler: ({ params, body }) => {
      const db = getDatabase();
      const current = findProgram(db, params.id);
      if (!CARD_STATUSES.includes(body.estado)) throw badRequest("El estado de la tarjeta no es válido.");
      const updated = { ...current, estado: body.estado, actualizadaEn: new Date().toISOString() };
      db.tarjetas = db.tarjetas.map(item => (item.id === current.id ? updated : item));
      saveDatabase();
      return respond(withMetrics(db, updated));
    }
  },
  {
    method: "post",
    path: "/loyalty-programs/:id/duplicate",
    auth: true,
    handler: ({ params }) => {
      const db = getDatabase();
      const current = findProgram(db, params.id);
      const now = new Date().toISOString();
      const duplicate = {
        ...current,
        id: nextId(db.tarjetas),
        nombre: `Copia de ${current.nombre}`.slice(0, 50),
        estado: "Borrador",
        creadaEn: now,
        actualizadaEn: now
      };
      db.tarjetas.unshift(duplicate);
      saveDatabase();
      return respond(withMetrics(db, duplicate), 201);
    }
  },
  {
    method: "delete",
    path: "/loyalty-programs/:id",
    auth: true,
    handler: ({ params }) => {
      const db = getDatabase();
      const current = findProgram(db, params.id);
      db.tarjetas = db.tarjetas.filter(item => item.id !== current.id);
      saveDatabase();
      return respond(null, 204);
    }
  }
];
