import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { Avatar } from "../common/Avatar";
import { Stars } from "../common/Stars";
import { StatusPill } from "../common/StatusPill";
import { formatDate, timeAgo } from "../../utils/format";

export function ReviewItem({ review, onReply }) {
  const answer = String(review.respuesta || "").trim();
  return (
    <article className="review-item">
      <Avatar name={review.nombre} initials={review.iniciales} />
      <div className="review-copy">
        <div className="review-top">
          <Link to={`/panel/clientes/${review.clienteId}`} className="review-author">
            <strong>{review.nombre}</strong>
          </Link>
          <Stars score={Number(review.calificacion)} />
          <time className="review-date" dateTime={review.fecha} title={formatDate(review.fecha, { day: "numeric", month: "long", year: "numeric" })}>
            {timeAgo(review.fecha)}
          </time>
        </div>
        <div className="review-business">
          {review.negocio} · <StatusPill variant={review.sentimiento === "Por mejorar" ? "pending" : "active"}>{review.sentimiento}</StatusPill>
        </div>
        <p>{review.comentario}</p>
        {answer ? (
          <div className="review-answer">
            <div className="review-answer-heading">
              <strong>Respuesta del negocio</strong>
              <span className="review-reply-status answered">Respondida</span>
            </div>
            <p>{answer}</p>
            <button className="text-button" type="button" onClick={() => onReply(review)}>
              Editar respuesta
            </button>
          </div>
        ) : (
          <button className="text-button review-reply-button" type="button" onClick={() => onReply(review)}>
            Responder reseña
          </button>
        )}
      </div>
    </article>
  );
}

ReviewItem.propTypes = {
  review: PropTypes.shape({
    id: PropTypes.number.isRequired,
    clienteId: PropTypes.number,
    nombre: PropTypes.string,
    iniciales: PropTypes.string,
    fecha: PropTypes.string,
    calificacion: PropTypes.number,
    negocio: PropTypes.string,
    sentimiento: PropTypes.string,
    comentario: PropTypes.string,
    respuesta: PropTypes.string
  }).isRequired,
  onReply: PropTypes.func.isRequired
};
