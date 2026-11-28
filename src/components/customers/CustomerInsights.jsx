import { useState } from "react";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import { Icon } from "../common/Icon";
import { Skeleton } from "../common/Skeleton";
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
 * Avisos sobre clientes que dejaron de venir y acceso rápido para premiar a los más fieles.
 * Usa los segmentos del backend (AT_RISK y LOYAL) y crea promociones que llegan a Google Wallet.
 */
export function CustomerInsights() {
  const { showToast } = useToast();
  const [dialog, setDialog] = useState(null);
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

      {dialog && <PromotionDialog open segment={dialog} onClose={() => setDialog(null)} onCreated={created} />}
    </section>
  );
}
