import { getDatabase } from "../database";
import { respond } from "../http";
import { LOCALE } from "../../utils/constants";
import { capitalize } from "../../utils/format";

const DAY = 86400000;

function periodBounds(period, shift = 0) {
  const now = new Date();
  const duration = period === "year" ? now.getMonth() + 1 : period === "quarter" ? 3 : 1;
  const monthOffset = period === "year" ? 12 * shift : duration * shift;
  const start =
    period === "year"
      ? new Date(now.getFullYear() - shift, 0, 1)
      : new Date(now.getFullYear(), now.getMonth() - (period === "quarter" ? 2 : 0) - monthOffset, 1);
  const end = new Date(now);
  if (shift) {
    end.setDate(1);
    end.setMonth(end.getMonth() - monthOffset);
    end.setDate(Math.min(now.getDate(), new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate()));
  }
  return { start, end };
}

function summaryFor(db, period, shift = 0) {
  const { start, end } = periodBounds(period, shift);
  const visits = db.visitas.filter(visit => {
    const date = new Date(visit.fecha);
    return date >= start && date < end;
  });
  const frequency = visits.reduce((counts, visit) => counts.set(visit.clienteId, (counts.get(visit.clienteId) || 0) + 1), new Map());
  const returning = [...frequency.values()].filter(count => count > 1).length;
  const active = db.clientes.filter(customer => {
    const lastVisit = db.visitas
      .filter(visit => visit.clienteId === customer.id && new Date(visit.fecha) < end)
      .reduce((latest, visit) => Math.max(latest, new Date(visit.fecha).getTime()), 0);
    return lastVisit && end.getTime() - lastVisit <= 60 * DAY;
  }).length;
  return {
    sales: Number(visits.reduce((total, visit) => total + visit.monto, 0).toFixed(2)),
    customers: active,
    rewards: db.canjes.filter(item => {
      const date = new Date(item.fecha);
      return date >= start && date < end;
    }).length,
    returnRate: frequency.size ? (returning / frequency.size) * 100 : 0
  };
}

function seriesFor(db, period, metric) {
  const { start, end } = periodBounds(period);
  const buckets = [];
  if (period === "month") {
    for (const day = new Date(start); day < end; day.setDate(day.getDate() + 1)) {
      const date = new Date(day);
      buckets.push({
        start: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
        end: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
        short: new Intl.DateTimeFormat(LOCALE, { day: "numeric" }).format(date),
        label: new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "long" }).format(date)
      });
    }
  } else {
    for (const month = new Date(start); month < end; month.setMonth(month.getMonth() + 1)) {
      const date = new Date(month);
      buckets.push({
        start: new Date(date.getFullYear(), date.getMonth(), 1),
        end: new Date(date.getFullYear(), date.getMonth() + 1, 1),
        short: new Intl.DateTimeFormat(LOCALE, { month: "short" }).format(date).replace(".", ""),
        label: new Intl.DateTimeFormat(LOCALE, { month: "long", year: "numeric" }).format(date)
      });
    }
  }
  return buckets.map(bucket => {
    const records = db.visitas.filter(visit => {
      const date = new Date(visit.fecha);
      return date >= bucket.start && date < bucket.end;
    });
    return {
      label: capitalize(bucket.label),
      short: capitalize(bucket.short),
      value: Number(records.reduce((total, visit) => total + (metric === "visitas" ? 1 : visit.monto), 0).toFixed(2))
    };
  });
}

export function buildSuggestions(db) {
  const inactive = db.clientes.filter(customer => Date.now() - new Date(customer.ultimaVisita).getTime() > 60 * DAY).length;
  const paused = db.ubicaciones.filter(location => !location.activa).length;
  const unanswered = db.resenas.filter(review => !String(review.respuesta || "").trim()).length;
  return [
    ...(inactive ? [{ text: `${inactive} ${inactive === 1 ? "cliente dejó" : "clientes dejaron"} de venir hace más de 60 días.`, to: "/panel/clientes?estado=Inactiva", action: "Revisar clientes" }] : []),
    ...(paused ? [{ text: `${paused} ${paused === 1 ? "local está" : "locales están"} en pausa.`, to: "/panel/ubicaciones", action: "Ver ubicaciones" }] : []),
    ...(unanswered ? [{ text: `${unanswered} ${unanswered === 1 ? "reseña espera" : "reseñas esperan"} respuesta.`, to: "/panel/resenas?respuesta=Pendientes", action: "Responder reseñas" }] : [])
  ];
}

export const metricsHandlers = [
  {
    method: "get",
    path: "/metrics",
    auth: true,
    handler: ({ query }) => {
      const db = getDatabase();
      const period = ["month", "quarter", "year"].includes(query.period) ? query.period : "month";
      const metric = query.metric === "visitas" ? "visitas" : "ventas";
      const categoryCounts = new Map();
      db.clientes.forEach(customer => {
        const location = db.ubicaciones.find(item => item.id === customer.localId);
        if (location) categoryCounts.set(location.categoria, (categoryCounts.get(location.categoria) || 0) + 1);
      });
      const total = Math.max(1, db.clientes.length);
      const locations = db.ubicaciones
        .map(location => ({
          id: location.id,
          name: location.nombre,
          count: db.clientes.filter(customer => customer.localId === location.id).length
        }))
        .sort((first, second) => second.count - first.count);
      const recentCustomers = [...db.clientes]
        .sort((first, second) => new Date(second.ultimaVisita) - new Date(first.ultimaVisita))
        .slice(0, 4)
        .map(({ id, nombre, iniciales, tarjeta, distrito, ultimaVisita }) => ({ id, nombre, iniciales, tarjeta, distrito, ultimaVisita }));
      return respond({
        period,
        metric,
        current: summaryFor(db, period),
        previous: summaryFor(db, period, 1),
        series: seriesFor(db, period, metric),
        categories: [...categoryCounts.entries()].map(([name, count]) => ({ name, count, share: (count / total) * 100 })),
        topLocations: locations,
        recentCustomers,
        totalCustomers: db.clientes.length,
        suggestions: buildSuggestions(db).slice(0, 3)
      });
    }
  }
];
