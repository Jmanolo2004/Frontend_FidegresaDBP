import { getDatabase } from "../database";
import { respond, toPage } from "../http";

const DAY = 86400000;
const PROGRAMS = {
  stamps: { label: "Estampillas", type: "Estampillas", color: "#603f2a" },
  cashback: { label: "Cashback", type: "Cashback", color: "#c8894f" },
  tiers: { label: "Niveles", type: "Niveles", color: "#4e8066" },
  giftcard: { label: "Gift card", type: "Giftcard", color: "#8a5a7a" }
};

function parseDate(value, fallback) {
  if (!value) return fallback;
  const [year, month, day] = String(value).split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date, amount) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function inRange(date, from, until) {
  const value = new Date(date);
  return value >= from && value < until;
}

function selectedProgram(program) {
  return PROGRAMS[program] || null;
}

function getRange(query) {
  const now = new Date();
  const to = addDays(parseDate(query.to, new Date(now.getFullYear(), now.getMonth(), now.getDate())), 1);
  const from = parseDate(query.from, new Date(now.getFullYear(), now.getMonth(), 1));
  const duration = Math.max(1, Math.ceil((to - from) / DAY));
  let compareFrom;
  let compareTo;
  if (query.compare === "lastYear") {
    compareFrom = new Date(from.getFullYear() - 1, from.getMonth(), from.getDate());
    compareTo = new Date(to.getFullYear() - 1, to.getMonth(), to.getDate());
  } else if (query.range === "month") {
    compareFrom = new Date(from.getFullYear(), from.getMonth() - 1, 1);
    const previousMonthDays = new Date(compareFrom.getFullYear(), compareFrom.getMonth() + 1, 0).getDate();
    compareTo = addDays(compareFrom, Math.min(duration, previousMonthDays));
  } else {
    compareFrom = addDays(from, -duration);
    compareTo = from;
  }
  return { from, to, compareFrom, compareTo, duration };
}

function filteredData(db, from, to, query) {
  const program = selectedProgram(query.program);
  const branchId = Number(query.branchId) || null;
  const visits = db.visitas.filter(visit => {
    const customer = db.clientes.find(item => Number(item.id) === Number(visit.clienteId));
    return customer &&
      inRange(visit.fecha, from, to) &&
      (!branchId || Number(visit.ubicacionId) === branchId) &&
      (!program || customer.tipoTarjeta === program.type);
  });
  const customers = db.clientes.filter(customer =>
    (!branchId || Number(customer.localId) === branchId) &&
    (!program || customer.tipoTarjeta === program.type)
  );
  const visitsPerCustomer = new Map();
  visits.forEach(visit => visitsPerCustomer.set(visit.clienteId, (visitsPerCustomer.get(visit.clienteId) || 0) + 1));
  const unique = visitsPerCustomer.size;
  const returning = [...visitsPerCustomer.values()].filter(count => count > 1).length;
  const sales = visits.reduce((sum, visit) => sum + Number(visit.monto || 0), 0);
  const periodEnd = Math.min(to.getTime(), Date.now());
  const active = customers.filter(customer => {
    const last = db.visitas
      .filter(visit => Number(visit.clienteId) === Number(customer.id) && new Date(visit.fecha).getTime() < periodEnd)
      .reduce((latest, visit) => Math.max(latest, new Date(visit.fecha).getTime()), 0);
    return last && periodEnd - last <= 60 * DAY;
  }).length;
  const created = customers.filter(customer => inRange(customer.fechaRegistro, from, to)).length;
  return {
    visits,
    visitCount: visits.length,
    customers,
    sales,
    active,
    created,
    returningRate: unique ? (returning / unique) * 100 : 0,
    ticket: visits.length ? sales / visits.length : 0
  };
}

function changeOf(current, previous) {
  return previous ? Number((((current - previous) / previous) * 100).toFixed(1)) : null;
}

function summarize(current, previous) {
  const currentValues = { sales: current.sales, visits: current.visitCount, active: current.active, created: current.created, returningRate: current.returningRate, ticket: current.ticket };
  const previousValues = { sales: previous.sales, visits: previous.visitCount, active: previous.active, created: previous.created, returningRate: previous.returningRate, ticket: previous.ticket };
  return Object.fromEntries(Object.keys(currentValues).map(key => [
    key,
    {
      current: Number((currentValues[key] || 0).toFixed?.(1) ?? currentValues[key] ?? 0),
      previous: Number((previousValues[key] || 0).toFixed?.(1) ?? previousValues[key] ?? 0),
      change: key === "returningRate"
        ? previous.visitCount ? Number(((currentValues[key] || 0) - (previousValues[key] || 0)).toFixed(1)) : null
        : changeOf(currentValues[key] || 0, previousValues[key] || 0),
      explanation: previousValues[key] ? "" : "No hubo actividad en el periodo de comparación."
    }
  ]));
}

function bucketSeries(current, range) {
  const span = Math.ceil((range.to - range.from) / DAY);
  const step = span <= 31 ? 1 : span <= 120 ? 7 : 30;
  const buckets = [];
  for (let cursor = new Date(range.from); cursor < range.to; cursor = step === 30
    ? new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    : addDays(cursor, step)) {
    const end = step === 30
      ? new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
      : addDays(cursor, step);
    const visits = current.visits.filter(item => inRange(item.fecha, cursor, end));
    const activeCustomerIds = new Set(current.visits.filter(item => {
      const timestamp = new Date(item.fecha).getTime();
      return timestamp >= end.getTime() - 60 * DAY && timestamp < end.getTime();
    }).map(item => item.clienteId));
    const frequency = visits.reduce((map, visit) => map.set(visit.clienteId, (map.get(visit.clienteId) || 0) + 1), new Map());
    const returning = [...frequency.values()].filter(count => count > 1).length;
    const day = new Date(cursor);
    buckets.push({
      label: step === 1
        ? day.toLocaleDateString("es-PE", { day: "numeric", month: "short" })
        : day.toLocaleDateString("es-PE", { month: "short", year: "2-digit" }),
      visitas: visits.length,
      clientesNuevos: current.customers.filter(customer => inRange(customer.fechaRegistro, cursor, end)).length,
      ventas: Number(visits.reduce((sum, item) => sum + Number(item.monto || 0), 0).toFixed(2)),
      clientesActivos: activeCustomerIds.size,
      tasaRetorno: frequency.size ? Number((returning / frequency.size * 100).toFixed(1)) : 0,
      ticket: visits.length ? Number((visits.reduce((sum, item) => sum + Number(item.monto || 0), 0) / visits.length).toFixed(2)) : 0
    });
  }
  return { interval: step === 1 ? "day" : step === 7 ? "week" : "month", items: buckets };
}

function createBreakdowns(db, query, range) {
  const all = filteredData(db, range.from, range.to, { ...query, program: "all" });
  const byProgram = Object.entries(PROGRAMS).map(([key, program]) => {
    const metrics = filteredData(db, range.from, range.to, { ...query, program: key });
    const previous = filteredData(db, range.compareFrom, range.compareTo, { ...query, program: key });
    return {
      key,
      label: program.label,
      color: program.color,
      customers: metrics.customers.length,
      visits: metrics.visits.length,
      sales: Number(metrics.sales.toFixed(2)),
      redemptions: metrics.visits.filter(visit => visit.premioCanjeado).length,
      trend: changeOf(metrics.sales, previous.sales),
      card: db.tarjetas.find(card => card.tipo === program.type && (!query.branchId || db.ubicaciones.some(branch => branch.id === Number(query.branchId) && branch.nombre === card.negocio))) || db.tarjetas.find(card => card.tipo === program.type)
    };
  });
  const branches = db.ubicaciones.filter(branch => !query.branchId || Number(branch.id) === Number(query.branchId)).map(branch => {
    const branchMetrics = filteredData(db, range.from, range.to, { ...query, branchId: branch.id });
    const uniqueCustomers = new Set(branchMetrics.visits.map(item => item.clienteId));
    const recurrentCustomers = [...uniqueCustomers].filter(id => branchMetrics.visits.filter(item => item.clienteId === id).length > 1).length;
    const reviews = db.resenas.filter(review => Number(review.ubicacionId) === Number(branch.id));
    return {
      id: branch.id,
      name: branch.nombre,
      sales: Number(branchMetrics.sales.toFixed(2)),
      visits: branchMetrics.visits.length,
      returnRate: uniqueCustomers.size ? Number((recurrentCustomers / uniqueCustomers.size * 100).toFixed(1)) : 0,
      rating: reviews.length ? Number((reviews.reduce((sum, review) => sum + review.calificacion, 0) / reviews.length).toFixed(1)) : 0
    };
  }).sort((a, b) => b.sales - a.sales);
  return { programs: byProgram, branches, totalSales: all.sales };
}

function programDetails(db, query, range) {
  const programs = {};
  Object.entries(PROGRAMS).forEach(([key, program]) => {
    const current = filteredData(db, range.from, range.to, { ...query, program: key });
    const typeCustomers = current.customers;
    const stampTarget = 10;
    programs[key] = {
      kpis: key === "stamps" ? {
        issued: current.visits.length,
        completed: current.visits.filter(visit => visit.premioCanjeado).length,
        redemptions: current.visits.filter(visit => visit.premioCanjeado).length,
        completionRate: current.visits.length ? Number((current.visits.filter(visit => visit.premioCanjeado).length / current.visits.length * 100).toFixed(1)) : 0,
        daysToComplete: 24,
        stampsPerVisit: 1
      } : key === "cashback" ? {
        issued: Number((current.sales * 0.06).toFixed(2)),
        redeemed: Number((current.sales * 0.025).toFixed(2)),
        pending: Number(typeCustomers.reduce((sum, customer) => sum + Number(customer.saldoCashback || 0), 0).toFixed(2)),
        redemptionRate: current.sales ? 41.7 : 0,
        incrementalSales: Number((current.sales * 0.18).toFixed(2)),
        costRate: 6
      } : key === "tiers" ? {
        levels: ["Bronce", "Plata", "Oro", "Diamante"].map((name, index) => ({ name, count: typeCustomers.filter((_, customerIndex) => customerIndex % 4 === index).length })),
        promotions: Math.round(current.visits.length * 0.08),
        demotions: Math.round(current.visits.length * 0.015),
        daysToUpgrade: 42,
        averageSpend: Number((current.ticket * 3.2).toFixed(2))
      } : {
        sold: Math.round(current.visits.length * 0.12),
        amount: Number((current.sales * 0.15).toFixed(2)),
        redeemed: Number((current.sales * 0.09).toFixed(2)),
        balance: Number((current.sales * 0.06).toFixed(2)),
        breakage: Number((current.sales * 0.008).toFixed(2)),
        newCustomers: typeCustomers.filter(customer => customer.visitas <= 2).length
      },
      histogram: Array.from({ length: stampTarget + 1 }, (_, index) => ({
        label: String(index),
        value: typeCustomers.filter(customer => Number(customer.estampillas || 0) === index).length
      })),
      closeToReward: typeCustomers.filter(customer => Number(customer.estampillas || 0) >= stampTarget - 2).slice(0, 5).map(customer => ({ id: customer.id, name: customer.nombre, progress: Number(customer.estampillas || 0) })),
      balances: ["0–10", "10–25", "25–50", "50+"].map((label, index) => ({ label, value: typeCustomers.filter(customer => {
        const balance = Number(customer.saldoCashback || 0);
        return index === 0 ? balance < 10 : index === 1 ? balance >= 10 && balance < 25 : index === 2 ? balance >= 25 && balance < 50 : balance >= 50;
      }).length })),
      series: bucketSeries(current, range).items.map(item => ({
        label: item.label,
        issued: Number((item.ventas * 0.06).toFixed(2)),
        redeemed: Number((item.ventas * 0.025).toFixed(2))
      })),
      levels: ["Bronce", "Plata", "Oro", "Diamante"].map((name, index) => ({ name, count: typeCustomers.filter((_, customerIndex) => customerIndex % 4 === index).length })),
      giftDenominations: [{ label: "S/ 50", value: 18 }, { label: "S/ 100", value: 34 }, { label: "S/ 200", value: 19 }, { label: "Libre", value: 11 }],
      expiring: typeCustomers.slice(0, 4).map(customer => ({ id: customer.id, name: customer.nombre, amount: 50 + (customer.id % 4) * 25, days: (customer.id % 25) + 1 })),
      seasonality: bucketSeries(current, range).items.map(item => ({ label: item.label, sold: Math.round(item.visitas * 0.12) }))
    };
  });
  return programs;
}

function heatmapFor(visits) {
  return Array.from({ length: 7 }, (_, day) => Array.from({ length: 15 }, (_, hourIndex) => {
    const hour = hourIndex + 8;
    const count = visits.filter(visit => {
      const date = new Date(visit.fecha);
      return date.getDay() === day && (8 + ((Number(String(visit.id).replace(/\D/g, "")) || 12) % 15)) === hour;
    }).length;
    return { day, hour, count };
  }));
}

function cohortsFor(db, query) {
  const now = parseDate(query.to, new Date());
  const throughMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return Array.from({ length: 6 }, (_, index) => {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
    const cohort = db.clientes.filter(customer =>
      inRange(customer.fechaRegistro, monthStart, monthEnd) &&
      (!Number(query.branchId) || Number(customer.localId) === Number(query.branchId)) &&
      (!query.program || query.program === "all" || customer.tipoTarjeta === PROGRAMS[query.program]?.type)
    );
    return {
      month: monthStart.toLocaleDateString("es-PE", { month: "short", year: "2-digit" }),
      values: Array.from({ length: Math.min(6, (throughMonth.getFullYear() - monthStart.getFullYear()) * 12 + throughMonth.getMonth() - monthStart.getMonth()) }, (_, monthIndex) => {
        const month = new Date(monthStart.getFullYear(), monthStart.getMonth() + monthIndex, 1);
        const end = new Date(month.getFullYear(), month.getMonth() + 1, 1);
        const retained = cohort.filter(customer => db.visitas.some(visit =>
          Number(visit.clienteId) === Number(customer.id) &&
          inRange(visit.fecha, month, end) &&
          (!query.branchId || Number(visit.ubicacionId) === Number(query.branchId))
        )).length;
        return cohort.length ? Math.round(retained / cohort.length * 100) : 0;
      })
    };
  });
}

function makeActivity(db, query) {
  const program = selectedProgram(query.program);
  const branchId = Number(query.branchId) || null;
  const visits = db.visitas
    .filter(visit => !branchId || Number(visit.ubicacionId) === branchId)
    .flatMap(visit => {
      const customer = db.clientes.find(person => Number(person.id) === Number(visit.clienteId));
      const branch = db.ubicaciones.find(item => Number(item.id) === Number(visit.ubicacionId));
      if (!customer || (program && customer.tipoTarjeta !== program.type)) return [];
      const type = customer.tipoTarjeta;
      const isRedemption = visit.premioCanjeado;
      const event = isRedemption ? "Canjeó premio" :
        type === "Estampillas" ? "+1 sello" :
          type === "Cashback" ? "Usó cashback" :
            type === "Niveles" && visit.id.endsWith("1") ? "Subió de nivel" :
              type === "Giftcard" && visit.id.endsWith("1") ? "Compró gift card" : "Registró una visita";
      const card = db.tarjetas.find(item => item.tipo === type && item.negocio === branch?.nombre);
      const progress = Number(customer.estampillas || 0);
      const signal = type === "Giftcard" && Number(customer.id) % 4 === 0 ? "Vence pronto" :
        progress >= 8 && type === "Estampillas" ? "A 1–2 sellos del premio" :
          Date.now() - new Date(customer.ultimaVisita).getTime() > 45 * DAY ? "Riesgo de abandono" :
            Date.now() - new Date(customer.fechaRegistro).getTime() < 30 * DAY ? "Cliente nuevo" :
            type === "Niveles" && event === "Subió de nivel" ? "Subió de nivel" : "";
      return [{
        id: visit.id,
        customerId: customer.id,
        customerName: customer.nombre,
        initials: customer.iniciales,
        branch: branch?.nombre || customer.tarjeta,
        program: type,
        cardName: card?.nombre || type,
        cardId: card?.id,
        progress,
        target: card?.reglas?.sellosMeta || 10,
        balance: Number(customer.saldoCashback || 0),
        level: ["Bronce", "Plata", "Oro", "Diamante"][customer.id % 4],
        event,
        amount: isRedemption || type === "Cashback" ? Number(visit.monto || 0) : null,
        signal,
        date: visit.fecha
      }];
    });
  const registrations = db.clientes.flatMap(customer => {
    const branch = db.ubicaciones.find(item => Number(item.id) === Number(customer.localId));
    const card = db.tarjetas.find(item => item.tipo === customer.tipoTarjeta && item.negocio === branch?.nombre);
    if ((branchId && Number(customer.localId) !== branchId) || (program && customer.tipoTarjeta !== program.type)) return [];
    return [{
      id: `registration-${customer.id}`,
      customerId: customer.id,
      customerName: customer.nombre,
      initials: customer.iniciales,
      branch: branch?.nombre || customer.tarjeta,
      program: customer.tipoTarjeta,
      cardName: card?.nombre || customer.tipoTarjeta,
      cardId: card?.id,
      progress: Number(customer.estampillas || 0),
      target: card?.reglas?.sellosMeta || 10,
      balance: Number(customer.saldoCashback || 0),
      level: ["Bronce", "Plata", "Oro", "Diamante"][customer.id % 4],
      event: "Se registró",
      amount: null,
      signal: "Cliente nuevo",
      date: customer.fechaRegistro
    }];
  });
  const activity = [...visits, ...registrations]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .filter(item => !query.type || query.type === "all" || item.event === query.type);
  if (!query.from && !query.to) return activity;
  const range = getRange(query);
  return activity.filter(item => inRange(item.date, range.from, range.to));
}

function createInsights(db, query) {
  const program = selectedProgram(query.program);
  const customers = db.clientes.filter(customer =>
    (!Number(query.branchId) || Number(customer.localId) === Number(query.branchId)) &&
    (!program || customer.tipoTarjeta === program.type)
  );
  const nearReward = customers.filter(customer => customer.tipoTarjeta === "Estampillas" && Number(customer.estampillas || 0) >= 8).length;
  const inactive = customers.filter(customer => Date.now() - new Date(customer.ultimaVisita).getTime() > 60 * DAY).length;
  const branch = db.ubicaciones.find(item => Number(item.id) === Number(query.branchId));
  return [
    nearReward && { id: "reward-near", priority: 1, text: `${nearReward} clientes están a 1 o 2 sellos del premio.`, impact: "Más visitas esta semana", action: "Crear audiencia", to: `/panel/geolocalizacion/audiencias/nueva?${new URLSearchParams({ ...(branch ? { branchId: String(branch.id) } : {}), program: "stamps", closeToReward: "true" })}` },
    inactive && { id: "inactive", priority: 2, text: `${inactive} clientes no vuelven hace más de 60 días.`, impact: "Recupera clientes en riesgo", action: "Revisar clientes", to: "/panel/clientes?estado=Inactiva" },
    { id: "review", priority: 3, text: "Responde las reseñas pendientes para fortalecer la confianza.", impact: "Mejora la reputación de tu local", action: "Ver reseñas", to: "/panel/resenas?respuesta=Pendientes" }
  ].filter(Boolean);
}

export const metricsOverviewHandlers = [
  {
    method: "get",
    path: "/metrics/overview",
    auth: true,
    handler: ({ query }) => {
      const db = getDatabase();
      const range = getRange(query);
      const current = filteredData(db, range.from, range.to, query);
      const previous = filteredData(db, range.compareFrom, range.compareTo, query);
      return respond({
        owner: db.configuracion.perfilNombre,
        plan: db.configuracion.plan || "Emprende",
        range: { from: query.from, to: query.to, compare: query.compare || "previous" },
        kpis: summarize(current, previous),
        series: bucketSeries(current, range),
        breakdowns: createBreakdowns(db, query, range),
        programs: programDetails(db, query, range),
        traffic: heatmapFor(current.visits),
        funnel: [
          { label: "Registrados", value: current.customers.length },
          { label: "1.ª visita", value: Math.round(current.customers.length * 0.82) },
          { label: "2.ª visita", value: Math.round(current.customers.length * 0.59) },
          { label: "Recurrentes (3+)", value: Math.round(current.customers.length * 0.38) },
          { label: "Canjearon premio", value: current.visits.filter(visit => visit.premioCanjeado).length }
        ],
        cohorts: cohortsFor(db, query),
        insights: createInsights(db, query)
      });
    }
  },
  {
    method: "get",
    path: "/metrics/activity",
    auth: true,
    handler: ({ query }) => {
      const db = getDatabase();
      const content = toPage(makeActivity(db, query), query);
      return respond(content);
    }
  },
  {
    method: "get",
    path: "/metrics/cohorts",
    auth: true,
    handler: ({ query }) => respond(cohortsFor(getDatabase(), query))
  },
  {
    method: "get",
    path: "/metrics/insights",
    auth: true,
    handler: ({ query }) => respond(createInsights(getDatabase(), query))
  },
  {
    method: "get",
    path: "/metrics/export",
    auth: true,
    handler: ({ query }) => {
      const db = getDatabase();
      const range = getRange(query);
      const rows = makeActivity(db, query).filter(item => inRange(item.date, range.from, range.to));
      const headers = ["Cliente", "Local", "Programa", "Tarjeta", "Evento", "Importe", "Señal", "Fecha"];
      const escape = value => `"${String(value ?? "").replaceAll("\"", "\"\"")}"`;
      const csv = [headers, ...rows.map(item => [item.customerName, item.branch, item.program, item.cardName, item.event, item.amount, item.signal, item.date])]
        .map(row => row.map(escape).join(",")).join("\n");
      return respond({ filename: "fidegresa-actividad.csv", content: `\uFEFF${csv}` });
    }
  }
];
