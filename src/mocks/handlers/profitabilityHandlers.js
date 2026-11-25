import { getDatabase } from "../database";
import { badRequest, notFound, respond } from "../http";
import { formatLocalDate, inclusiveDayCount, parseLocalDate } from "../../utils/metricsDates";

/*
 * Mismo cálculo que ProfitabilityCalculator en el backend. Los montos se suman en céntimos
 * para que las cifras cuadren a mano sin errores de decimales.
 */
const RECURRING_VISITS = 2;
const cents = value => Math.round(Number(value || 0) * 100);
const soles = value => value / 100;

function shiftDays(date, amount) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

function parseDate(value, fallback) {
  if (!value) return fallback;
  const text = String(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || formatLocalDate(parseLocalDate(text)) !== text) {
    throw badRequest("Las fechas deben tener el formato AAAA-MM-DD.");
  }
  return parseLocalDate(text);
}

function readPeriod(query) {
  const now = new Date();
  const to = parseDate(query.to, new Date(now.getFullYear(), now.getMonth(), now.getDate()));
  const from = parseDate(query.from, new Date(to.getFullYear(), to.getMonth(), 1));
  if (from > to) throw badRequest("La fecha de inicio no puede ser posterior a la fecha final.");
  if (from.getFullYear() < 2000 || to.getFullYear() > 2100) throw badRequest("Elige fechas entre los años 2000 y 2100.");
  return { from, to };
}

export function previousPeriod({ from, to }) {
  const sameMonth = from.getFullYear() === to.getFullYear() && from.getMonth() === to.getMonth();
  if (from.getDate() === 1 && sameMonth) {
    const monthDays = new Date(to.getFullYear(), to.getMonth() + 1, 0).getDate();
    const previousDays = new Date(from.getFullYear(), from.getMonth(), 0).getDate();
    const lastDay = to.getDate() === monthDays ? previousDays : Math.min(to.getDate(), previousDays);
    return {
      from: new Date(from.getFullYear(), from.getMonth() - 1, 1),
      to: new Date(from.getFullYear(), from.getMonth() - 1, lastDay)
    };
  }
  const days = inclusiveDayCount(formatLocalDate(from), formatLocalDate(to));
  return { from: shiftDays(from, -days), to: shiftDays(from, -1) };
}

function movementsIn(db, { from, to }, branchId) {
  const until = shiftDays(to, 1);
  const programs = new Map(db.tarjetas.map(program => [Number(program.id), program]));
  return db.visitas
    .filter(visit => {
      const date = new Date(visit.fecha);
      return date >= from && date < until && (!branchId || Number(visit.ubicacionId) === branchId);
    })
    .map(visit => ({
      customerId: Number(visit.clienteId),
      branchId: Number(visit.ubicacionId),
      program: programs.get(Number(visit.programaId)) || null,
      type: visit.tipo || (visit.premioCanjeado ? "REDEMPTION" : Number(visit.monto) > 0 ? "VISIT" : "CONSULT"),
      amount: cents(visit.monto)
    }));
}

function isVisit({ type, program }) {
  return ["VISIT", "STAMP", "PURCHASE"].includes(type) || (type === "BALANCE_CHARGE" && program?.tipo === "Giftcard");
}

function saleOf({ type, program, amount }) {
  return type === "STAMP" && amount === 0 ? cents(program?.averageTicket) : amount;
}

function costOf({ type, program, amount }) {
  if (type === "REDEMPTION") return cents(program?.rewardCost);
  return type === "BALANCE_CHARGE" && program?.tipo === "Cashback" ? amount : 0;
}

function recurringCustomers(movements) {
  const visits = new Map();
  movements.filter(isVisit).forEach(({ customerId }) => visits.set(customerId, (visits.get(customerId) || 0) + 1));
  return new Set([...visits].filter(([, count]) => count >= RECURRING_VISITS).map(([customerId]) => customerId));
}

function summarize(movements, recurring) {
  const recurringVisits = movements.filter(movement => isVisit(movement) && recurring.has(movement.customerId));
  const sales = recurringVisits.reduce((total, movement) => total + saleOf(movement), 0);
  const cost = movements.reduce((total, movement) => total + costOf(movement), 0);
  return {
    recurringCustomers: new Set(recurringVisits.map(movement => movement.customerId)).size,
    recurringSales: soles(sales),
    rewardsCost: soles(cost),
    returnRatio: cost ? Math.round((sales / cost) * 100) / 100 : null
  };
}

const hasActivity = summary => summary.recurringCustomers > 0 || summary.recurringSales > 0 || summary.rewardsCost > 0;
const isMissing = value => value === null || value === undefined;

function programRows(db, movements, recurring, branch) {
  const rows = db.tarjetas.flatMap(program => {
    const summary = summarize(movements.filter(movement => movement.program?.id === program.id), recurring);
    const listed = program.estado !== "Borrador" && (!branch || program.negocio === branch.nombre);
    if (!listed && !hasActivity(summary)) return [];
    const usesStamps = program.tipo === "Estampillas";
    return [{
      programId: program.id,
      name: program.nombre,
      type: program.tipo,
      branchName: program.negocio,
      ...summary,
      missingRewardCost: usesStamps && isMissing(program.rewardCost),
      missingAverageTicket: usesStamps && isMissing(program.averageTicket)
    }];
  }).sort((first, second) => second.recurringSales - first.recurringSales || first.name.localeCompare(second.name, "es"));
  const withoutProgram = summarize(movements.filter(movement => !movement.program), recurring);
  if (hasActivity(withoutProgram)) {
    rows.push({ programId: null, name: "Sin programa", type: null, branchName: null, ...withoutProgram, missingRewardCost: false, missingAverageTicket: false });
  }
  return rows;
}

export const profitabilityHandlers = [
  {
    method: "get",
    path: "/metrics/profitability",
    auth: true,
    handler: ({ query }) => {
      const db = getDatabase();
      const period = readPeriod(query);
      const branchId = query.branchId ? Number(query.branchId) : null;
      if (branchId !== null && !Number.isInteger(branchId)) throw badRequest("Revisa los datos enviados.");
      const branch = branchId === null ? null : db.ubicaciones.find(place => Number(place.id) === branchId);
      if (branchId !== null && !branch) throw notFound("No encontramos el local seleccionado.");

      const movements = movementsIn(db, period, branchId);
      const recurring = recurringCustomers(movements);
      const previous = previousPeriod(period);
      const previousMovements = movementsIn(db, previous, branchId);
      const byBranch = (branch ? [branch] : db.ubicaciones)
        .map(place => ({
          branchId: place.id,
          name: place.nombre,
          ...summarize(movements.filter(movement => movement.branchId === Number(place.id)), recurring)
        }))
        .sort((first, second) => second.recurringSales - first.recurringSales);

      return respond({
        from: formatLocalDate(period.from),
        to: formatLocalDate(period.to),
        ...summarize(movements, recurring),
        previousPeriod: {
          from: formatLocalDate(previous.from),
          to: formatLocalDate(previous.to),
          ...summarize(previousMovements, recurringCustomers(previousMovements))
        },
        byProgram: programRows(db, movements, recurring, branch),
        byBranch
      });
    }
  }
];
