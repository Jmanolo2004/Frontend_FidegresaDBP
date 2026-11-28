import { useState } from "react";
import PropTypes from "prop-types";
import { Icon } from "../common/Icon";
import { Skeleton } from "../common/Skeleton";
import { FilterSelect } from "../common/FilterSelect";
import { useFetch } from "../../hooks/useFetch";
import { useToast } from "../../hooks/useToast";
import { reviewService } from "../../services/reviewService";
import { toApiError } from "../../api/apiErrors";

const PERIODS = [
  { value: "30", label: "Últimos 30 días" },
  { value: "90", label: "Últimos 90 días" },
  { value: "365", label: "Último año" }
];

const isoDay = date => date.toISOString().slice(0, 10);
const formatDay = value => new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" });

/** Mensajes claros para los errores propios de la IA (el resto usa el mensaje del backend). */
function aiErrorMessage(error) {
  const apiError = toApiError(error);
  if (apiError.status === 503) return "El resumen con IA todavía no está activado en el servidor. Falta configurar la clave de IA en el backend.";
  if (apiError.status === 502) return "La IA no respondió esta vez. Inténtalo de nuevo en unos minutos.";
  return apiError.message;
}

function InsightList({ title, items, icon }) {
  if (!items?.length) return null;
  return (
    <div className="ai-insight">
      <h3><Icon name={icon} size={16} /> {title}</h3>
      <ul>
        {items.map(item => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}

InsightList.propTypes = { title: PropTypes.string.isRequired, items: PropTypes.arrayOf(PropTypes.string), icon: PropTypes.string.isRequired };

/**
 * Resumen de reseñas hecho con IA, por local o de todo el negocio.
 * Solo se pide a la IA cuando el dueño toca "Generar": el backend guarda el resultado y lo reutiliza si las reseñas no cambiaron.
 */
export function AiSummaryPanel({ branchId, branchName }) {
  const { showToast } = useToast();
  const [period, setPeriod] = useState("90");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const request = useFetch(({ signal }) => reviewService.getAiSummary(branchId, { signal }), [branchId]);
  const notFound = toApiError(request.error).status === 404;
  const summary = request.data;
  const scope = branchName || "todos tus locales";

  const generate = async () => {
    setGenerating(true);
    setGenerateError("");
    try {
      const to = new Date();
      const from = new Date(to.getTime() - (Number(period) - 1) * 24 * 60 * 60 * 1000);
      const result = await reviewService.generateAiSummary({ branchId, from: isoDay(from), to: isoDay(to) });
      request.setData(result);
      showToast(result.cached ? "Las reseñas no cambiaron: este es el resumen más reciente." : "Resumen actualizado.");
    } catch (error) {
      setGenerateError(aiErrorMessage(error));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <article className="panel ai-summary" aria-labelledby="ai-summary-title" aria-busy={generating}>
      <div className="ai-summary-head">
        <div>
          <p className="ai-summary-eyebrow"><Icon name="star" size={14} /> Resumen con IA</p>
          <h2 id="ai-summary-title">Lo que dicen tus clientes en {scope}</h2>
        </div>
        <div className="ai-summary-actions">
          <FilterSelect value={period} onChange={setPeriod} options={PERIODS} label="Periodo del resumen" />
          <button type="button" className="primary-button" onClick={generate} disabled={generating}>
            <Icon name="refresh" size={16} />
            {generating ? "Analizando reseñas…" : summary ? "Actualizar resumen" : "Generar resumen"}
          </button>
        </div>
      </div>

      {generateError && <p className="ai-summary-error" role="alert">{generateError}</p>}

      {request.loading && !summary ? (
        <div className="ai-summary-loading"><Skeleton height={16} /><Skeleton height={16} width="80%" /><Skeleton height={16} width="60%" /></div>
      ) : summary ? (
        <>
          {!summary.upToDate && <p className="ai-summary-note">Llegaron reseñas nuevas desde este resumen. Actualízalo para incluirlas.</p>}
          <p className="ai-summary-text">{summary.summary}</p>
          <div className="ai-insights">
            <InsightList title="Lo que más gusta" items={summary.strengths} icon="star" />
            <InsightList title="Por mejorar" items={summary.improvements} icon="alert" />
            <InsightList title="Ideas para actuar" items={summary.suggestedActions} icon="target" />
          </div>
          <p className="ai-summary-meta">
            Basado en {summary.reviewCount} {summary.reviewCount === 1 ? "reseña" : "reseñas"} del {formatDay(summary.from)} al {formatDay(summary.to)}
            {summary.model === "demo" ? " · Resumen de demostración, sin IA" : " · Generado con IA"}. Revísalo antes de tomar decisiones.
          </p>
        </>
      ) : notFound ? (
        <p className="ai-summary-empty">
          Todavía no hay un resumen de {scope}. Elige el periodo y toca <strong>Generar resumen</strong>: la IA lee las reseñas y te dice qué gusta, qué mejorar y qué hacer. Necesitas al menos 3 reseñas en el periodo.
        </p>
      ) : (
        request.error && <p className="ai-summary-error" role="alert">{aiErrorMessage(request.error)}</p>
      )}
    </article>
  );
}

AiSummaryPanel.propTypes = { branchId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]), branchName: PropTypes.string };
