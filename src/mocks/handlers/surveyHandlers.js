import { getDatabase, saveDatabase } from "../database";
import { badRequest, conflict, HttpError, notFound, respond } from "../http";

// Encuestas de satisfacción en modo demo (misma forma que SurveyDtos del backend).
// En el demo cualquier código de 20 a 60 letras abre una encuesta, por ejemplo /encuesta/demo-encuesta-cafe-plaza.
const TOKEN = /^[A-Za-z0-9_-]{20,60}$/;
const DEFAULT_SETTINGS = { enabled: true, question: "¿Cómo fue tu visita de hoy?", cooldownDays: 14 };
const DAY = 24 * 60 * 60 * 1000;

function settingsOf(db) {
  db.encuestas = db.encuestas || { configuracion: { ...DEFAULT_SETTINGS, updatedAt: null }, respuestas: {} };
  return db.encuestas;
}

function sentiment(rating) {
  return rating >= 4 ? "Positiva" : rating === 3 ? "Neutral" : "Por mejorar";
}

function inRange(date, from, to) {
  const day = String(date).slice(0, 10);
  return (!from || day >= from) && (!to || day <= to);
}

function round(value, digits = 1) {
  return Number(value.toFixed(digits));
}

export const surveyHandlers = [
  {
    method: "get",
    path: "/surveys/settings",
    auth: true,
    handler: () => {
      const config = settingsOf(getDatabase()).configuracion;
      // El demo se muestra como un negocio ya configurado (Google Wallet y enlace público listos).
      return respond({ ...config, walletReady: true, emailReady: true });
    }
  },
  {
    method: "put",
    path: "/surveys/settings",
    auth: true,
    handler: ({ body }) => {
      const db = getDatabase();
      const config = settingsOf(db).configuracion;
      if (body.question != null) {
        const question = String(body.question).trim();
        if (!question) throw badRequest("Escribe la pregunta de la encuesta.");
        if (question.length > 120) throw badRequest("La pregunta puede tener hasta 120 caracteres.");
        config.question = question;
      }
      if (body.cooldownDays != null) {
        const days = Number(body.cooldownDays);
        if (!Number.isInteger(days) || days < 1 || days > 60) throw badRequest("Los días entre encuestas deben estar entre 1 y 60.");
        config.cooldownDays = days;
      }
      if (body.enabled != null) config.enabled = Boolean(body.enabled);
      config.updatedAt = new Date().toISOString();
      saveDatabase();
      return respond({ ...config, walletReady: true, emailReady: true });
    }
  },
  {
    method: "get",
    path: "/metrics/surveys",
    auth: true,
    handler: ({ query }) => {
      const db = getDatabase();
      const today = new Date();
      const to = query.to || today.toISOString().slice(0, 10);
      const from = query.from || new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
      const span = Math.max(1, Math.round((new Date(to) - new Date(from)) / DAY) + 1);
      const previousTo = new Date(new Date(from).getTime() - DAY).toISOString().slice(0, 10);
      const previousFrom = new Date(new Date(from).getTime() - span * DAY).toISOString().slice(0, 10);
      const branches = db.ubicaciones.filter(place => !query.branchId || Number(place.id) === Number(query.branchId));

      // En el demo cada visita con compra cuenta como una encuesta enviada y cada reseña como una respondida.
      const stats = (branch, start, end) => {
        const sent = db.visitas.filter(visit => Number(visit.ubicacionId) === Number(branch.id) && inRange(visit.fecha, start, end)).length;
        const answeredReviews = db.resenas.filter(review => Number(review.ubicacionId) === Number(branch.id) && inRange(review.fecha, start, end));
        const answered = Math.min(sent, answeredReviews.length);
        const ratings = answeredReviews.slice(0, answered).map(review => Number(review.calificacion));
        return {
          sent,
          answered,
          responseRate: sent ? round((answered / sent) * 100) : 0,
          averageRating: ratings.length ? round(ratings.reduce((sum, value) => sum + value, 0) / ratings.length) : 0
        };
      };
      const total = (start, end) => {
        const rows = branches.map(branch => stats(branch, start, end));
        const sent = rows.reduce((sum, row) => sum + row.sent, 0);
        const answered = rows.reduce((sum, row) => sum + row.answered, 0);
        const weighted = rows.reduce((sum, row) => sum + row.averageRating * row.answered, 0);
        return { sent, answered, responseRate: sent ? round((answered / sent) * 100) : 0, averageRating: answered ? round(weighted / answered) : 0 };
      };
      return respond({
        from,
        to,
        totals: total(from, to),
        previous: { from: previousFrom, to: previousTo, ...total(previousFrom, previousTo) },
        byBranch: branches.map(branch => ({ branchId: branch.id, branchName: branch.nombre, ...stats(branch, from, to) }))
      });
    }
  },
  {
    method: "get",
    path: "/public/surveys/:token",
    handler: ({ params }) => {
      if (!TOKEN.test(params.token)) throw notFound("Encuesta no encontrada.");
      const db = getDatabase();
      const branch = db.ubicaciones[0];
      return respond({
        businessName: branch.nombre,
        branchName: branch.nombre,
        question: settingsOf(db).configuracion.question,
        primaryColor: db.configuracion?.colorPrincipal || null,
        status: settingsOf(db).respuestas[params.token] ? "ANSWERED" : "OPEN",
        expiresAt: new Date(Date.now() + 7 * DAY).toISOString()
      });
    }
  },
  {
    method: "post",
    path: "/public/surveys/:token",
    handler: ({ params, body }) => {
      if (!TOKEN.test(params.token)) throw notFound("Encuesta no encontrada.");
      const db = getDatabase();
      const surveys = settingsOf(db);
      if (surveys.respuestas[params.token]) throw conflict("Ya respondiste esta encuesta. ¡Gracias!");
      const rating = Number(body.rating);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw badRequest("Elige una calificación de 1 a 5 estrellas.");
      const comment = String(body.comment || "").trim();
      if (comment.length > 1000) throw badRequest("El comentario puede tener hasta 1000 caracteres.");
      const branch = db.ubicaciones[0];
      const customer = db.clientes.find(item => Number(item.localId) === Number(branch.id)) || db.clientes[0];
      if (!customer) throw new HttpError(500, "No hay clientes en el demo.");
      db.resenas.unshift({
        id: Math.max(0, ...db.resenas.map(review => Number(review.id) || 0)) + 1,
        clienteId: customer.id,
        nombre: customer.nombre,
        iniciales: customer.iniciales,
        negocio: branch.nombre,
        ubicacionId: branch.id,
        fecha: new Date().toISOString(),
        calificacion: rating,
        comentario: comment,
        sentimiento: sentiment(rating),
        respuesta: null
      });
      surveys.respuestas[params.token] = new Date().toISOString();
      saveDatabase();
      return respond({ status: "ANSWERED", message: "¡Gracias por tu opinión!" });
    }
  }
];

// Resumen de reseñas en modo demo. No usa IA: arma el texto con reglas a partir de las reseñas del periodo
// (model "demo"), para que la pantalla se pueda presentar sin backend ni clave de IA.
function demoSummary(reviews, branchName) {
  const total = reviews.length;
  const average = reviews.reduce((sum, review) => sum + Number(review.calificacion), 0) / total;
  const positive = reviews.filter(review => Number(review.calificacion) >= 4);
  const low = reviews.filter(review => Number(review.calificacion) <= 2);
  const pending = reviews.filter(review => !String(review.respuesta || "").trim()).length;
  const unique = list => [...new Set(list.map(review => String(review.comentario || "").trim()).filter(Boolean))];
  return {
    summary: `${branchName ? `En ${branchName}, l` : "L"}os clientes dejaron ${total} reseñas con un promedio de ${average.toFixed(1)} de 5. ${positive.length} son positivas y ${low.length} piden mejoras.`,
    strengths: unique(positive).slice(0, 3),
    improvements: unique(low).slice(0, 3),
    suggestedActions: [
      pending ? `Responde las ${pending} reseñas que siguen sin respuesta.` : "Sigue respondiendo cada reseña: todas tienen respuesta.",
      low.length ? "Escribe a los clientes que calificaron con 1 o 2 estrellas para entender qué pasó." : "Pide a tus clientes más fieles que dejen su opinión."
    ]
  };
}

export const aiSummaryHandlers = [
  {
    method: "get",
    path: "/reviews/ai-summary",
    auth: true,
    handler: ({ query }) => {
      const db = getDatabase();
      const key = query.branchId ? String(query.branchId) : "todos";
      const saved = db.resumenesIa?.[key];
      if (!saved) throw notFound("Todavía no hay un resumen de reseñas.");
      const current = db.resenas.filter(review => (!query.branchId || Number(review.ubicacionId) === Number(query.branchId)) && inRange(review.fecha, saved.from, saved.to));
      return respond({ ...saved, cached: false, upToDate: current.length === saved.reviewCount });
    }
  },
  {
    method: "post",
    path: "/reviews/ai-summary",
    auth: true,
    handler: ({ body }) => {
      const db = getDatabase();
      const today = new Date();
      const to = body.to || today.toISOString().slice(0, 10);
      const from = body.from || new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
      const branch = body.branchId ? db.ubicaciones.find(place => Number(place.id) === Number(body.branchId)) : null;
      if (body.branchId && !branch) throw notFound("Local no encontrado.");
      const reviews = db.resenas.filter(review => (!branch || Number(review.ubicacionId) === Number(branch.id)) && inRange(review.fecha, from, to));
      if (reviews.length < 3) {
        throw new HttpError(422, `Se necesitan al menos 3 reseñas en el rango para hacer un resumen. Hay ${reviews.length}.`);
      }
      const key = branch ? String(branch.id) : "todos";
      const saved = {
        id: Date.now(),
        from,
        to,
        branchId: branch?.id ?? null,
        branchName: branch?.nombre ?? null,
        reviewCount: reviews.length,
        ...demoSummary(reviews, branch?.nombre),
        model: "demo",
        generatedAt: new Date().toISOString()
      };
      db.resumenesIa = { ...(db.resumenesIa || {}), [key]: saved };
      saveDatabase();
      return respond({ ...saved, cached: false, upToDate: true });
    }
  }
];
