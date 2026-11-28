import "@fontsource-variable/bricolage-grotesque/standard.css";
import "@fontsource-variable/instrument-sans/index.css";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useFetch } from "../../hooks/useFetch";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { Spinner } from "../../components/common/Spinner";
import { surveyService } from "../../services/surveyService";
import { toApiError } from "../../api/apiErrors";
import "../../styles/public-menu.css";

const LABELS = { 1: "Muy mala", 2: "Mala", 3: "Regular", 4: "Buena", 5: "Excelente" };

/** Encuesta de satisfacción que recibe la clienta por correo o en su pase de Google Wallet (/encuesta/:token). */
export default function SurveyPage() {
  const { token } = useParams();
  const { data: survey, error, loading } = useFetch(options => surveyService.getPublic(token, options), [token]);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [done, setDone] = useState(null);
  useDocumentTitle(survey ? `Tu opinión sobre ${survey.branchName}` : "Encuesta");

  const submit = async event => {
    event.preventDefault();
    if (sending) return;
    if (!rating) {
      setSendError("Elige de 1 a 5 estrellas.");
      return;
    }
    setSending(true);
    setSendError("");
    try {
      const response = await surveyService.answer(token, { rating, comment: comment.trim() });
      setDone(response.message || "¡Gracias por tu opinión!");
    } catch (failure) {
      const apiError = toApiError(failure);
      // 409: ya la respondió; 410: venció. En ambos casos se muestra el mensaje del backend como cierre.
      if (apiError.status === 409 || apiError.status === 410) setDone(apiError.message);
      else setSendError(apiError.message);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <main className="pm-page">
        <div className="pm-shell pm-empty"><Spinner /><p>Abriendo la encuesta…</p></div>
      </main>
    );
  }

  if (!survey) {
    const apiError = toApiError(error);
    return (
      <main className="pm-page">
        <div className="pm-shell pm-empty">
          <h1>{apiError.status === 404 ? "No encontramos esta encuesta" : "No pudimos abrir la encuesta"}</h1>
          <p>{apiError.status === 404 ? "Puede que el enlace esté incompleto. Ábrelo otra vez desde tu correo o tu tarjeta." : apiError.message}</p>
          <Link className="pm-footer-link" to="/">Conoce Fidegresa</Link>
        </div>
      </main>
    );
  }

  const closedMessage = survey.status === "ANSWERED" ? "Ya respondiste esta encuesta. ¡Gracias!" : survey.status === "EXPIRED" ? "Esta encuesta ya venció." : null;
  const brand = survey.primaryColor || "#241510";

  return (
    <main className="pm-page" style={{ "--pm-brand": brand }}>
      <div className="pm-shell">
        <header className="pm-hero">
          <p className="pm-eyebrow">{survey.businessName}</p>
          <h1>{survey.branchName}</h1>
        </header>

        {done || closedMessage ? (
          <section className="pm-survey pm-survey-done" aria-live="polite">
            <h2>{done || closedMessage}</h2>
            <p className="pm-muted">Tu opinión le ayuda a {survey.businessName} a mejorar en cada visita.</p>
          </section>
        ) : (
          <form className="pm-survey" onSubmit={submit} noValidate>
            <h2 id="pm-survey-question">{survey.question}</h2>
            <div className="pm-stars" role="radiogroup" aria-labelledby="pm-survey-question">
              {[1, 2, 3, 4, 5].map(value => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={rating === value}
                  aria-label={`${value} ${value === 1 ? "estrella" : "estrellas"}: ${LABELS[value]}`}
                  className={value <= rating ? "is-on" : undefined}
                  onClick={() => {
                    setRating(value);
                    setSendError("");
                  }}
                >
                  ★
                </button>
              ))}
            </div>
            <p className="pm-stars-label" aria-hidden="true">{rating ? LABELS[rating] : "Toca una estrella"}</p>
            <label className="pm-field">
              <span>Cuéntanos más <em>(opcional)</em></span>
              <textarea name="comment" rows={4} maxLength={1000} value={comment} onChange={event => setComment(event.target.value)} placeholder="¿Qué te gustó? ¿Qué podemos mejorar?" />
            </label>
            {sendError && <p className="pm-server-error" role="alert">{sendError}</p>}
            <button type="submit" className="pm-primary" disabled={sending}>{sending ? "Enviando…" : "Enviar mi opinión"}</button>
          </form>
        )}

        <footer className="pm-footer">
          <Link className="pm-footer-link" to="/">Club de beneficios con Fidegresa</Link>
        </footer>
      </div>
    </main>
  );
}
