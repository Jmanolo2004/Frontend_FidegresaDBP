import { useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { PanelHeading } from "../../components/common/PanelHeading";
import { FilterSelect } from "../../components/common/FilterSelect";
import { Pagination } from "../../components/common/Pagination";
import { EmptyState } from "../../components/common/EmptyState";
import { ErrorState } from "../../components/common/ErrorState";
import { Stars } from "../../components/common/Stars";
import { Skeleton, TableSkeleton } from "../../components/common/Skeleton";
import { ReviewItem } from "../../components/reviews/ReviewItem";
import { ReplyDialog } from "../../components/reviews/ReplyDialog";
import { useFetch } from "../../hooks/useFetch";
import { usePagination } from "../../hooks/usePagination";
import { useSettings } from "../../hooks/useSettings";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { reviewService } from "../../services/reviewService";

const SENTIMENT_OPTIONS = [
  { value: "Todas", label: "Todas las opiniones" },
  { value: "Positiva", label: "Positivas" },
  { value: "Neutral", label: "Neutrales" },
  { value: "Por mejorar", label: "Por mejorar" }
];

const REPLY_OPTIONS = [
  { value: "Todas", label: "Todas las respuestas" },
  { value: "Pendientes", label: "Pendientes" },
  { value: "Respondidas", label: "Respondidas" }
];

export default function ReviewsPage() {
  useDocumentTitle("Reseñas");
  const { refreshNotices } = useSettings();
  const { page, size, filters, setPage, setSize, setFilter } = usePagination({ opinion: "Todas", respuesta: "Todas" });
  const [replyingTo, setReplyingTo] = useState(null);

  const summary = useFetch(({ signal }) => reviewService.getSummary({ signal }), []);
  const reviews = useFetch(
    ({ signal }) => reviewService.getPage({ page, size, sentiment: filters.opinion, reply: filters.respuesta }, { signal }),
    [page, size, filters.opinion, filters.respuesta]
  );

  const handleSaved = updated => {
    setReplyingTo(null);
    reviews.setData(current => ({ ...current, content: current.content.map(review => (review.id === updated.id ? updated : review)) }));
    if (filters.respuesta === "Pendientes") reviews.refresh();
    summary.refresh();
    refreshNotices();
  };

  const stats = summary.data;
  const pending = stats?.pending ?? 0;
  const pageData = reviews.data;

  return (
    <>
      <PageHeader
        title="Reseñas"
        summary={stats ? `${stats.average.toFixed(1)} de 5 estrellas en ${stats.total} opiniones; ${pending === 1 ? "1 pendiente" : `${pending} pendientes`} de respuesta.` : "Cargando las opiniones de tus clientes…"}
      />

      {stats ? (
        <>
          <div className="review-summary">
            <article className="panel rating-card">
              <strong className="rating-number">{stats.average.toFixed(1)}</strong>
              <Stars score={stats.average} label={`${stats.average.toFixed(1)} de 5 estrellas`} />
              <span className="rating-caption">{stats.total} comentarios compartidos</span>
            </article>
            <article className="panel rating-breakdown">
              {stats.distribution.map(item => (
                <div className="rating-row" key={item.score}>
                  <span>{item.score} estrellas</span>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${stats.total ? (item.count / stats.total) * 100 : 0}%` }} />
                  </div>
                  <span>{item.count}</span>
                </div>
              ))}
            </article>
          </div>
          <div className="sentiment-grid">
            {[
              [stats.positive, "Positivas", "Positiva"],
              [stats.neutral, "Neutrales", "Neutral"],
              [stats.improve, "Por mejorar", "Por mejorar"]
            ].map(([value, label, filter]) => (
              <button type="button" className={`sentiment-card${filters.opinion === filter ? " selected" : ""}`} key={label} onClick={() => setFilter("opinion", filters.opinion === filter ? "Todas" : filter)}>
                <strong>{value}</strong>
                <span>{label}</span>
              </button>
            ))}
            <button type="button" className={`sentiment-card pending-reviews${filters.respuesta === "Pendientes" ? " selected" : ""}`} onClick={() => setFilter("respuesta", filters.respuesta === "Pendientes" ? "Todas" : "Pendientes")}>
              <strong>{pending}</strong>
              <span>Sin responder</span>
            </button>
          </div>
        </>
      ) : (
        !summary.error && <Skeleton height={150} radius={13} className="skeleton-block" />
      )}

      <article className="panel review-panel">
        <PanelHeading title="Comentarios de clientes" subtitle="Responde a tus clientes y cuida su experiencia.">
          <div className="review-filters">
            <FilterSelect value={filters.opinion} onChange={value => setFilter("opinion", value)} options={SENTIMENT_OPTIONS} label="Filtrar por opinión" />
            <FilterSelect value={filters.respuesta} onChange={value => setFilter("respuesta", value)} options={REPLY_OPTIONS} label="Filtrar por respuesta" />
          </div>
        </PanelHeading>
        <div aria-live="polite" aria-busy={reviews.loading}>
          {reviews.error && !pageData ? (
            <ErrorState error={reviews.error} onRetry={reviews.reload} compact />
          ) : !pageData ? (
            <TableSkeleton rows={4} />
          ) : pageData.content.length === 0 ? (
            <EmptyState message="No hay reseñas con estos filtros." actionLabel="Ver todas" onAction={() => { setFilter("opinion", "Todas"); setFilter("respuesta", "Todas"); }} />
          ) : (
            <div className={reviews.loading ? "is-refreshing" : ""}>
              <div className="review-list">
                {pageData.content.map(review => (
                  <ReviewItem key={review.id} review={review} onReply={setReplyingTo} />
                ))}
              </div>
              <Pagination page={pageData.number} totalPages={pageData.totalPages} totalElements={pageData.totalElements} size={pageData.size} onPageChange={setPage} onSizeChange={setSize} itemLabel="reseñas" />
            </div>
          )}
        </div>
      </article>

      <ReplyDialog review={replyingTo} onClose={() => setReplyingTo(null)} onSaved={handleSaved} />
    </>
  );
}
