import { useState } from "react";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import { Icon } from "../common/Icon";
import { Skeleton } from "../common/Skeleton";
import { Spinner } from "../common/Spinner";
import { useFetch } from "../../hooks/useFetch";
import { useToast } from "../../hooks/useToast";
import { segmentService } from "../../services/segmentService";
import { promotionService } from "../../services/promotionService";
import { toApiError } from "../../api/apiErrors";
import { formatDate } from "../../utils/format";
import { PromotionDialog } from "./PromotionDialog";
import "../../styles/customer-insights.css";

const SHOWN = 4;
const STATUS = {
  LIVE: { label: "Activa", tone: "live" },
  SCHEDULED: { label: "Programada", tone: "scheduled" },
  PAUSED: { label: "En pausa", tone: "paused" },
  EXPIRED: { label: "Terminó", tone: "expired" }
};

const AUDIENCE = { LOYAL: "tus clientes fieles", AT_RISK: "quienes dejaron de venir" };
const MAX_GOAL = 200;
const people = count => `${count} ${count === 1 ? "cliente" : "clientes"}`;

/** Nombres de los primeros clientes del grupo, con enlace a su ficha. */
function NameList({ request, total }) {
  if (!request.data) return <Skeleton height={14} width="70%" />;
  const names = request.data.content || [];
  if (!names.length) return null;
  return (
    <p className="ci-names">
      {names.map((customer, index) => (
        <span key={customer.id}>
          <Link className="customer-link" to={`/panel/clientes/${customer.id}`}>{customer.fullName}</Link>
          {index < names.length - 1 ? ", " : ""}
        </span>
      ))}
      {total > names.length ? ` y ${total - names.length} más.` : "."}
    </p>
  );
}

NameList.propTypes = { request: PropTypes.object.isRequired, total: PropTypes.number.isRequired };

/**
 * "Recomiéndame una promo": la IA mira tus números (segmentos, tarjetas y promociones anteriores) y propone una
 * promoción. No se lanza nada: "Usar esta promoción" abre el formulario de siempre ya lleno para revisarlo.
 */
function AiPromotion({ onUse }) {
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [idea, setIdea] = useState(null);

  const ask = async event => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      setIdea(await promotionService.recommend({ goal: goal.trim() }));
    } catch (failure) {
      setError(toApiError(failure).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <article className="panel ci-card ci-ai" aria-labelledby="ci-ai-title" aria-busy={loading}>
      <div className="ci-card-icon" aria-hidden="true"><Icon name="star" size={18} /></div>
      <h2 id="ci-ai-title">¿No sabes qué promoción lanzar?</h2>
      <p className="ci-lead">La IA revisa a tus clientes, tus tarjetas y cómo te fue con las promociones anteriores, y te propone una. Tú decides si la lanzas.</p>
      <form className="ci-ai-form" onSubmit={ask}>
        <label className="ci-ai-goal">
          <span>¿Qué quieres lograr? <em>(opcional)</em></span>
          <input
            className="form-control"
            maxLength={MAX_GOAL}
            value={goal}
            onChange={event => setGoal(event.target.value)}
            placeholder="Ej. llenar las tardes de lunes a miércoles"
          />
        </label>
        <button type="submit" className="primary-button" disabled={loading}>
          {loading ? <Spinner label="Pensando una promoción" /> : <Icon name="star" size={16} />}
          {loading ? "Pensando…" : idea ? "Otra idea" : "Recomiéndame una promo"}
        </button>
      </form>
      {error && <p className="ci-error" role="alert">{error}</p>}
      {idea && !loading && (
        <div className="ci-idea" aria-live="polite">
          <div className="ci-idea-head">
            <strong>{idea.name}</strong>
            <span className="ci-status live">{idea.discountLabel} de descuento</span>
          </div>
          {idea.description && <p className="ci-idea-text">“{idea.description}”</p>}
          <ul className="ci-idea-facts">
            <li><span>Para</span>{idea.segmentLabel}{idea.programName ? ` · ${idea.programName}` : ""}</li>
            <li><span>Llega a</span>{people(idea.audienceCustomers)}{idea.audienceWithWallet ? ` (${idea.audienceWithWallet} con aviso en Google Wallet)` : ""}</li>
            <li><span>Vigencia</span>{formatDate(idea.startsOn)} al {formatDate(idea.endsOn)}</li>
          </ul>
          {idea.reason && <p className="ci-reason"><strong>Por qué:</strong> {idea.reason}</p>}
          <button type="button" className="primary-button" onClick={() => onUse(idea)} disabled={!idea.audienceCustomers}>
            Usar esta promoción
          </button>
        </div>
      )}
    </article>
  );
}

AiPromotion.propTypes = { onUse: PropTypes.func.isRequired };

/**
 * Avisos sobre clientes que dejaron de venir y acceso rápido para premiar a los más fieles.
 * Usa los segmentos del backend (AT_RISK y LOYAL) y crea promociones que llegan a Google Wallet.
 */
export function CustomerInsights() {
  const { showToast } = useToast();
  const [dialog, setDialog] = useState(null);
  const [draft, setDraft] = useState(null);
  const segments = useFetch(({ signal }) => segmentService.getAll({ signal }), []);
  const settings = useFetch(({ signal }) => segmentService.getSettings({ signal }), []);
  const atRiskNames = useFetch(({ signal }) => segmentService.getCustomers("AT_RISK", { size: SHOWN }, { signal }), []);
  const loyalNames = useFetch(({ signal }) => segmentService.getCustomers("LOYAL", { size: SHOWN }, { signal }), []);
  const promotions = useFetch(({ signal }) => promotionService.getPage({ size: 4 }, { signal }), []);
  const [toggling, setToggling] = useState(null);

  const find = key => segments.data?.find(item => item.key === key);
  const atRisk = find("AT_RISK");
  const loyal = find("LOYAL");
  const config = settings.data;

  const created = promotion => {
    setDialog(null);
    setDraft(null);
    promotions.refresh();
    if (promotion.status === "SCHEDULED") showToast(`Promoción programada desde el ${formatDate(promotion.startsOn)}.`);
    else if (promotion.notified) showToast(`Promoción lanzada: avisamos a ${people(promotion.notified)} en Google Wallet.`);
    else showToast("Promoción lanzada: se aplica al pagar en caja.");
  };

  const toggle = async promotion => {
    setToggling(promotion.id);
    try {
      const updated = await promotionService.setActive(promotion.id, promotion.status === "PAUSED");
      promotions.setData(previous => ({ ...previous, content: previous.content.map(item => (item.id === updated.id ? updated : item)) }));
      showToast(updated.active ? "Promoción reactivada." : "Promoción en pausa.");
    } catch (error) {
      showToast(toApiError(error).message);
    } finally {
      setToggling(null);
    }
  };

  if (segments.error) {
    return (
      <article className="panel ci-panel">
        <p className="ci-error" role="alert">No pudimos revisar a tus clientes: {toApiError(segments.error).message}</p>
      </article>
    );
  }

  const list = promotions.data?.content || [];

  return (
    <section className="ci-grid" aria-label="Clientes que necesitan atención">
      <article className={`panel ci-card ci-risk${atRisk?.customers ? "" : " is-calm"}`} aria-busy={!atRisk}>
        <div className="ci-card-icon" aria-hidden="true"><Icon name="alert" size={18} /></div>
        {!atRisk ? (
          <Skeleton height={60} />
        ) : atRisk.customers ? (
          <>
            <h2>{people(atRisk.customers)} dejaron de venir</h2>
            <p className="ci-lead">
              Venían seguido, pero no vuelven hace más de {config?.atRiskDays ?? 30} días. Un descuento a tiempo los puede traer de regreso.
            </p>
            <NameList request={atRiskNames} total={atRisk.customers} />
            <button type="button" className="primary-button" onClick={() => setDialog("AT_RISK")}>
              <Icon name="bell" size={16} />
              Invitar a volver
            </button>
          </>
        ) : (
          <>
            <h2>Nadie dejó de venir</h2>
            <p className="ci-lead">Todos tus clientes frecuentes volvieron en los últimos {config?.atRiskDays ?? 30} días.</p>
          </>
        )}
      </article>

      <article className="panel ci-card ci-loyal" aria-busy={!loyal}>
        <div className="ci-card-icon" aria-hidden="true"><Icon name="reward" size={18} /></div>
        {!loyal ? (
          <Skeleton height={60} />
        ) : loyal.customers ? (
          <>
            <h2>{people(loyal.customers)} fieles</h2>
            <p className="ci-lead">
              Vinieron {config?.loyalVisits ?? 4} veces o más en los últimos {config?.loyalDays ?? 60} días. Agradéceles con un beneficio especial.
            </p>
            <NameList request={loyalNames} total={loyal.customers} />
            <button type="button" className="primary-button" onClick={() => setDialog("LOYAL")}>
              <Icon name="star" size={16} />
              Premiar a mis mejores clientes
            </button>
          </>
        ) : (
          <>
            <h2>Aún no hay clientes fieles</h2>
            <p className="ci-lead">Cuando alguien venga {config?.loyalVisits ?? 4} veces en {config?.loyalDays ?? 60} días aparecerá aquí para que lo premies.</p>
          </>
        )}
      </article>

      <AiPromotion
        onUse={idea => {
          setDraft(idea);
          setDialog(idea.segment);
        }}
      />

      {list.length > 0 && (
        <article className="panel ci-promos" aria-labelledby="ci-promos-title">
          <h2 id="ci-promos-title">Tus promociones</h2>
          <ul>
            {list.map(promotion => {
              const state = STATUS[promotion.status] || STATUS.EXPIRED;
              return (
                <li key={promotion.id}>
                  <div className="ci-promo-main">
                    <strong>{promotion.name}</strong>
                    <span>
                      {promotion.discountLabel} de descuento para {AUDIENCE[promotion.segment] || promotion.segmentLabel.toLowerCase()}, hasta el {formatDate(promotion.endsOn)}
                    </span>
                  </div>
                  <div className="ci-promo-side">
                    <span className={`ci-status ${state.tone}`}>{state.label}</span>
                    {promotion.notified > 0 && <small>Avisada a {people(promotion.notified)}</small>}
                    {(promotion.status === "LIVE" || promotion.status === "PAUSED" || promotion.status === "SCHEDULED") && (
                      <button type="button" className="text-button" onClick={() => toggle(promotion)} disabled={toggling === promotion.id}>
                        {promotion.status === "PAUSED" ? "Reactivar" : "Pausar"}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </article>
      )}

      {dialog && (
        <PromotionDialog
          open
          segment={dialog}
          draft={draft}
          onClose={() => {
            setDialog(null);
            setDraft(null);
          }}
          onCreated={created}
        />
      )}
    </section>
  );
}
