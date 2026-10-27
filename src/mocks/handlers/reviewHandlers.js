import { getDatabase, saveDatabase } from "../database";
import { badRequest, notFound, respond, toPage } from "../http";

const hasReply = review => Boolean(String(review.respuesta || "").trim());

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
  }
];
