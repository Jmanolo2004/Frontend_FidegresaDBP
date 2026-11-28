import { getDatabase, saveDatabase } from "../database";
import { badRequest, notFound, respond, toPage } from "../http";

const hasReply = review => Boolean(String(review.respuesta || "").trim());

let suggestionTurn = -1;
const DEMO_REPLIES = {
  high: [
    "¡Muchas gracias por tu visita y por tus palabras! Nos alegra mucho que la hayas pasado bien. Te esperamos pronto.",
    "Gracias por compartir tu experiencia. Es un gusto atenderte y que disfrutes lo que preparamos. ¡Vuelve cuando quieras!"
  ],
  mid: [
    "Gracias por tu visita y por tu comentario. Tomamos nota de lo que nos cuentas para mejorar en tu próxima visita.",
    "Agradecemos tu opinión. Queremos que tu siguiente experiencia sea mejor y ya estamos trabajando en lo que mencionas."
  ],
  low: [
    "Lamentamos que tu experiencia no haya sido la esperada. Tomamos en cuenta tu comentario y nos gustaría saber más: escríbenos para ayudarte.",
    "Gracias por contarnos lo que pasó y disculpa las molestias. Lo vamos a revisar con el equipo; escríbenos para poder solucionarlo."
  ]
};

export const reviewHandlers = [
  {
    method: "get",
    path: "/reviews",
    auth: true,
    handler: ({ query }) => {
      const sentiment = query.sentiment || "Todas";
      const reply = query.reply || "Todas";
      const results = getDatabase()
        .resenas.filter(review => sentiment === "Todas" || review.sentimiento === sentiment)
        .filter(review => reply === "Todas" || (reply === "Respondidas" ? hasReply(review) : !hasReply(review)))
        .sort((first, second) => new Date(second.fecha) - new Date(first.fecha));
      return respond(toPage(results, query));
    }
  },
  {
    method: "get",
    path: "/reviews/summary",
    auth: true,
    handler: () => {
      const reviews = getDatabase().resenas;
      const total = reviews.length;
      const average = reviews.reduce((sum, review) => sum + Number(review.calificacion), 0) / Math.max(1, total);
      return respond({
        total,
        average: Number(average.toFixed(1)),
        distribution: [5, 4, 3, 2, 1].map(score => ({
          score,
          count: reviews.filter(review => Number(review.calificacion) === score).length
        })),
        positive: reviews.filter(review => review.sentimiento === "Positiva").length,
        neutral: reviews.filter(review => review.sentimiento === "Neutral").length,
        improve: reviews.filter(review => review.sentimiento === "Por mejorar").length,
        pending: reviews.filter(review => !hasReply(review)).length
      });
    }
  },
  {
    method: "patch",
    path: "/reviews/:id/reply",
    auth: true,
    handler: ({ params, body }) => {
      const review = getDatabase().resenas.find(item => Number(item.id) === Number(params.id));
      if (!review) throw notFound("No encontramos esta reseña.");
      const reply = String(body.reply || "").trim();
      if (!reply) throw badRequest("Escribe una respuesta antes de guardar.");
      if (reply.length > 500) throw badRequest("La respuesta puede tener hasta 500 caracteres.");
      review.respuesta = reply;
      saveDatabase();
      return respond(review);
    }
  },
  {
    // Respuesta sugerida en modo demo: no usa IA, elige un texto según la calificación (model "demo").
    method: "post",
    path: "/reviews/:id/reply-suggestion",
    auth: true,
    handler: ({ params }) => {
      const review = getDatabase().resenas.find(item => Number(item.id) === Number(params.id));
      if (!review) throw notFound("No encontramos esta reseña.");
      const rating = Number(review.calificacion);
      const options = DEMO_REPLIES[rating >= 4 ? "high" : rating === 3 ? "mid" : "low"];
      suggestionTurn += 1;
      return respond({ reviewId: review.id, suggestion: options[suggestionTurn % options.length], model: "demo" });
    }
  }
];

