import { getDatabase, saveDatabase } from "../database";
import { badRequest, HttpError, notFound, respond, toPage } from "../http";

// Referidos en modo demo (misma forma que ReferralDtos del backend). Los datos se crean la primera vez que se piden.
const DAY = 24 * 60 * 60 * 1000;
const LABELS = { PENDING: "Pendiente", REWARDED: "Premiado", LIMIT_REACHED: "Tope del mes" };
const day = date => new Date(date).toISOString().slice(0, 10);

function referralsOf(db) {
  if (db.referidos) return db.referidos;
  // Algunas clientas invitan a varias amigas; las invitadas son clientes registrados después.
  const ambassadors = [1, 3, 5, 9, 14, 2];
  const plan = [5, 4, 3, 2, 2, 1];
  const others = db.clientes.filter(customer => !ambassadors.includes(customer.id));
  const list = [];
  let cursor = 0;
  ambassadors.forEach((referrerId, position) => {
    const referrer = db.clientes.find(customer => customer.id === referrerId);
    if (!referrer) return;
    const program = db.tarjetas.find(card => card.negocio === referrer.tarjeta && card.tipo !== "Giftcard") || db.tarjetas[0];
    for (let index = 0; index < plan[position]; index += 1) {
      const referred = others[cursor % others.length];
      cursor += 1;
      const created = Date.now() - ((cursor * 5) % 70 + 1) * DAY;
      const converted = cursor % 4 !== 0;
      list.push({
        id: cursor,
        referrerId: referrer.id,
        referrerName: referrer.nombre,
        referredId: referred.id,
        referredName: referred.nombre,
        programId: program.id,
        programName: program.nombre,
        status: converted ? (cursor % 9 === 0 ? "LIMIT_REACHED" : "REWARDED") : "PENDING",
        createdAt: new Date(created).toISOString(),
        convertedAt: converted ? new Date(Math.min(Date.now(), created + 3 * DAY)).toISOString() : null
      });
    }
  });
  db.referidos = list;
  saveDatabase();
  return list;
}

function settingsOf(db) {
  db.referidosConfig = db.referidosConfig || {};
  return db.tarjetas
    .filter(card => card.tipo !== "Giftcard")
    .map(card => {
      const saved = db.referidosConfig[card.id] || {};
      const item = { enabled: true, rewardStamps: 1, rewardCashback: 5, rewardPoints: 50, ...saved };
      const reward = card.tipo === "Estampillas" ? `${item.rewardStamps} ${item.rewardStamps === 1 ? "sello" : "sellos"}`
        : card.tipo === "Cashback" ? `S/ ${Number(item.rewardCashback).toFixed(2)} de cashback`
        : `${item.rewardPoints} puntos`;
      return { programId: card.id, programName: card.nombre, programType: card.tipo, ...item, rewardCashback: Number(Number(item.rewardCashback).toFixed(2)), reward };
    });
}

function counts(list, from, to) {
  const inRange = value => value && day(value) >= from && day(value) <= to;
  const signups = list.filter(item => inRange(item.createdAt)).length;
  const converted = list.filter(item => item.status !== "PENDING" && inRange(item.convertedAt)).length;
  const rewards = list.filter(item => inRange(item.convertedAt)).reduce((sum, item) => sum + (item.status === "REWARDED" ? 2 : item.status === "LIMIT_REACHED" ? 1 : 0), 0);
  return { linkOpens: signups * 3 + converted, signups, converted, rewards };
}

/** Igual que GET /referrals/ranking: todas las invitaciones (o las creadas en from..to), por convertidas, invitadas y nombre. */
function ranking(list, query) {
  const limit = query.limit === undefined ? 5 : Number(query.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw badRequest("El límite del ranking va de 1 a 50.");
  const ranged = query.from || query.to;
  const byPerson = new Map();
  list.filter(item => !ranged || ((!query.from || day(item.createdAt) >= query.from) && (!query.to || day(item.createdAt) <= query.to)))
    .forEach(item => {
      const row = byPerson.get(item.referrerId) || { id: item.referrerId, name: item.referrerName, invited: 0, converted: 0 };
      row.invited += 1;
      if (item.status !== "PENDING") row.converted += 1;
      byPerson.set(item.referrerId, row);
    });
  return [...byPerson.values()]
    .sort((a, b) => b.converted - a.converted || b.invited - a.invited || a.name.localeCompare(b.name, "es", { sensitivity: "base" }) || a.id - b.id)
    .slice(0, limit);
}

export const referralHandlers = [
  {
    method: "get",
    path: "/referrals/ranking",
    auth: true,
    handler: ({ query }) => respond(ranking(referralsOf(getDatabase()), query))
  },
  {
    method: "get",
    path: "/referrals/stats",
    auth: true,
    handler: ({ query }) => {
      const list = referralsOf(getDatabase());
      const today = new Date();
      const to = query.to || day(today);
      const from = query.from || day(new Date(today.getFullYear(), today.getMonth(), 1));
      const span = Math.round((new Date(to) - new Date(from)) / DAY) + 1;
      if (span > 366) throw badRequest("Elige un rango de hasta 366 días.");
      const previousTo = day(new Date(from).getTime() - DAY);
      const previousFrom = day(new Date(from).getTime() - span * DAY);
      const totals = counts(list, from, to);
      return respond({
        from,
        to,
        totals,
        conversionRate: totals.signups ? Number(((totals.converted * 100) / totals.signups).toFixed(1)) : 0,
        previous: { from: previousFrom, to: previousTo, ...counts(list, previousFrom, previousTo) }
      });
    }
  },
  {
    method: "get",
    path: "/referrals",
    auth: true,
    handler: ({ query }) => {
      let list = [...referralsOf(getDatabase())].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      if (query.status) {
        const status = String(query.status).toUpperCase();
        if (!LABELS[status]) throw badRequest("El estado debe ser PENDING, REWARDED o LIMIT_REACHED.");
        list = list.filter(item => item.status === status);
      }
      const page = toPage(list, query);
      return respond({ ...page, content: page.content.map(item => ({ ...item, statusLabel: LABELS[item.status] })) });
    }
  },
  {
    method: "get",
    path: "/referrals/settings",
    auth: true,
    handler: () => respond(settingsOf(getDatabase()))
  },
  {
    method: "put",
    path: "/referrals/settings/:programId",
    auth: true,
    handler: ({ params, body }) => {
      const db = getDatabase();
      const card = db.tarjetas.find(item => Number(item.id) === Number(params.programId));
      if (!card) throw notFound("Programa no encontrado.");
      if (card.tipo === "Giftcard") throw new HttpError(422, "Las gift cards no tienen premio por referido.");
      const saved = { ...(db.referidosConfig?.[card.id] || {}) };
      if (body.rewardStamps != null) {
        if (!Number.isInteger(Number(body.rewardStamps)) || body.rewardStamps < 1 || body.rewardStamps > 10) throw badRequest("El premio debe ser de 1 a 10 sellos.");
        saved.rewardStamps = Number(body.rewardStamps);
      }
      if (body.rewardCashback != null) {
        const value = Number(body.rewardCashback);
        if (!(value >= 0.5 && value <= 100)) throw badRequest("El premio en cashback debe estar entre S/ 0.50 y S/ 100.00.");
        saved.rewardCashback = value;
      }
      if (body.rewardPoints != null) {
        if (!Number.isInteger(Number(body.rewardPoints)) || body.rewardPoints < 1 || body.rewardPoints > 10000) throw badRequest("El premio debe ser de 1 a 10000 puntos.");
        saved.rewardPoints = Number(body.rewardPoints);
      }
      if (body.enabled != null) saved.enabled = Boolean(body.enabled);
      db.referidosConfig = { ...(db.referidosConfig || {}), [card.id]: saved };
      saveDatabase();
      return respond(settingsOf(db).find(item => item.programId === card.id));
    }
  }
];
