import { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { EmptyState } from "../../components/common/EmptyState";
import { ErrorState } from "../../components/common/ErrorState";
import { FilterSelect } from "../../components/common/FilterSelect";
import { Icon } from "../../components/common/Icon";
import { KpiCard } from "../../components/common/KpiCard";
import { PageHeader } from "../../components/common/PageHeader";
import { SearchInput } from "../../components/common/SearchInput";
import { Skeleton } from "../../components/common/Skeleton";
import { CardFront } from "../../components/cards/CardFront";
import { CARD_TYPE_CONFIG, CARD_TYPE_KEYS } from "../../components/cards/cardTypes";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useFetch } from "../../hooks/useFetch";
import { useToast } from "../../hooks/useToast";
import { loyaltyProgramService } from "../../services/loyaltyProgramService";
import { formatMoney } from "../../utils/format";

const STATUS_OPTIONS = [
  { value: "Todos", label: "Todos los estados" },
  { value: "Activa", label: "Activas" },
  { value: "En pausa", label: "En pausa" },
  { value: "Borrador", label: "Borradores" }
];

const SORT_OPTIONS = [
  { value: "recent", label: "Más recientes" },
  { value: "name", label: "Nombre (A-Z)" },
  { value: "customers", label: "Más clientes" }
];

function getCardDetails(card) {
  const rules = card.reglas || {};
  if (card.tipo === "Estampillas") {
    const stampRule = rules.selloPor || "visita";
    return [
      { label: "Meta", value: `${rules.sellosMeta ?? card.estampillas ?? 10} sellos` },
      { label: "Recompensa", value: rules.premio || card.premio || card.descripcion || "Sin definir" },
      { label: "Acumulación", value: stampRule === "compra mínima" ? `Por compra desde ${formatMoney(rules.montoMinimo || 0)}` : "Por visita" },
      { label: "Límite diario", value: `${rules.limitePorDia ?? 1} sello${Number(rules.limitePorDia ?? 1) === 1 ? "" : "s"}` }
    ];
  }
  if (card.tipo === "Cashback") {
    return [
      { label: "Devolución", value: `${rules.porcentaje ?? card.porcentaje ?? 5}% por compra` },
      { label: "Tope mensual", value: rules.topeMensual === 0 ? "Sin límite" : formatMoney(rules.topeMensual ?? 0) },
      { label: "Mínimo para canjear", value: formatMoney(rules.saldoMinimoCanje ?? 0) },
      { label: "Vigencia del saldo", value: `${rules.expiraDias ?? 180} días` }
    ];
  }
  if (card.tipo === "Niveles") {
    const levels = Array.isArray(rules.niveles) ? rules.niveles : [];
    return [
      { label: "Niveles", value: levels.length ? levels.map(level => level.nombre).join(" · ") : `${card.niveles ?? 3} niveles` },
      ...levels.slice(0, 3).map(level => ({
        label: `${level.nombre} · ${Number(level.desdePuntos).toLocaleString("es-PE")} pts`,
        value: level.beneficio || "Beneficio por definir"
      })),
      { label: "Acumulación", value: `${rules.puntosPorSol ?? 1} punto${Number(rules.puntosPorSol ?? 1) === 1 ? "" : "s"} por sol` }
    ];
  }
  const amounts = Array.isArray(rules.montos) ? rules.montos : [];
  return [
    { label: "Montos disponibles", value: amounts.length ? amounts.map(amount => formatMoney(amount)).join(" · ") : formatMoney(card.saldo ?? 100) },
    { label: "Monto libre", value: rules.permiteMontoLibre ? `${formatMoney(rules.montoMin ?? 1)}–${formatMoney(rules.montoMax ?? 10000)}` : "No permitido" },
    { label: "Vigencia", value: `${rules.vigenciaMeses ?? card.vigenciaMeses ?? 12} meses` },
    { label: "Mensaje de regalo", value: rules.mensajeRegalo || card.descripcion || "Sin definir" }
  ];
}

function CardTile({ card, onStatusChange, onDuplicate, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const statusClass = card.estado === "Activa" ? "active" : card.estado === "En pausa" ? "paused" : "draft";
  return (
    <article className="card-gallery-item">
      <Link to={`/panel/tarjetas/${card.id}`} className="card-gallery-preview" aria-label={`Ver detalle de ${card.nombre}`}>
        <CardFront card={card} size="md" />
      </Link>
      <div className="card-gallery-meta">
        <div className="card-gallery-title">
          <div><h2>{card.nombre}</h2><span>{CARD_TYPE_CONFIG[card.tipo]?.label} · {card.negocio}</span></div>
          <span className={`program-status ${statusClass}`}><i />{card.estado}</span>
        </div>
        <div className="card-gallery-stats">
          <span><strong>{card.metricas?.clientesActivos || 0}</strong> clientes activos</span>
          <span><strong>{card.metricas?.canjes || 0}</strong> canjes</span>
          <span>{formatMoney(card.metricas?.ventasAsociadas || 0)}</span>
        </div>
        <dl className={`card-gallery-details card-gallery-details-${String(card.tipo || "estampillas").toLowerCase()}`}>
          {getCardDetails(card).map((detail, index) => (
            <div key={`${detail.label}-${index}`}>
              <dt>{detail.label}</dt>
              <dd>{detail.value}</dd>
            </div>
          ))}
        </dl>
        <div className="card-gallery-actions">
          <Link className="secondary-button" to={`/panel/tarjetas/${card.id}`}>Ver detalle</Link>
          <Link className="small-action" to={`/panel/tarjetas/${card.id}/editar`} aria-label={`Editar ${card.nombre}`}><Icon name="settings" size={15} />Editar</Link>
          <details className="card-action-menu" open={menuOpen} onToggle={event => setMenuOpen(event.currentTarget.open)}>
            <summary aria-label={`Más acciones para ${card.nombre}`} aria-expanded={menuOpen}>⋯</summary>
            <div className="card-action-menu-items">
              <button type="button" onClick={() => { setMenuOpen(false); onDuplicate(card); }}>Duplicar</button>
              <button type="button" onClick={() => { setMenuOpen(false); onStatusChange(card, card.estado === "Activa" ? "En pausa" : "Activa"); }}>
                {card.estado === "Activa" ? "Pausar" : "Activar"}
              </button>
              <button type="button" className="danger-text" onClick={() => { setMenuOpen(false); onDelete(card); }}>Eliminar</button>
            </div>
          </details>
        </div>
      </div>
    </article>
  );
}

CardTile.propTypes = {
  card: PropTypes.object.isRequired,
  onStatusChange: PropTypes.func.isRequired,
  onDuplicate: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired
};

export default function CardsPage() {
  useDocumentTitle("Tarjetas");
  const { showToast, showError } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [cardToDelete, setCardToDelete] = useState(null);
  const type = CARD_TYPE_KEYS.includes(searchParams.get("tipo")) ? searchParams.get("tipo") : "Todas";
  const status = STATUS_OPTIONS.some(option => option.value === searchParams.get("estado")) ? searchParams.get("estado") : "Todos";
  const search = searchParams.get("q") || "";
  const order = SORT_OPTIONS.some(option => option.value === searchParams.get("orden")) ? searchParams.get("orden") : "recent";
  const query = useFetch(({ signal }) => loyaltyProgramService.getAll({ type: type === "Todas" ? "" : type, status, search }, { signal }), [type, status, search]);
  const allPrograms = useFetch(({ signal }) => loyaltyProgramService.getAll({}, { signal }), []);

  const updateQuery = (key, value, defaultValue = "") => {
    setSearchParams(previous => {
      const next = new URLSearchParams(previous);
      if (!value || value === defaultValue) next.delete(key);
      else next.set(key, value);
      return next;
    }, { replace: true });
  };

  const cards = useMemo(() => {
    const filtered = (query.data || []).filter(card => type === "Todas" || card.tipo === type);
    return filtered.sort((first, second) => {
      if (order === "name") return first.nombre.localeCompare(second.nombre, "es");
      if (order === "customers") return (second.metricas?.clientesActivos || 0) - (first.metricas?.clientesActivos || 0);
      return new Date(second.actualizadaEn || second.creadaEn) - new Date(first.actualizadaEn || first.creadaEn);
    });
  }, [order, query.data, type]);
  const totals = allPrograms.data || [];
  const countOf = cardType => totals.filter(card => card.tipo === cardType).length;
  const groupedCards = CARD_TYPE_KEYS
    .filter(cardType => type === "Todas" || type === cardType)
    .map(cardType => ({
      type: cardType,
      cards: cards.filter(card => card.tipo === cardType)
    }))
    .filter(group => group.cards.length > 0);
  const activePrograms = totals.filter(card => card.estado === "Activa").length;
  const activeCustomers = totals.reduce((sum, card) => sum + (card.metricas?.clientesActivos || 0), 0);
  const monthlyRedemptions = totals.reduce((sum, card) => sum + (card.metricas?.canjesMes || 0), 0);

  const handleStatusChange = async (card, nextStatus) => {
    try {
      await loyaltyProgramService.setStatus(card.id, nextStatus);
      showToast(`La tarjeta ahora está ${nextStatus.toLowerCase()}.`);
      query.refresh();
      allPrograms.refresh();
    } catch (error) {
      showError(error.message);
    }
  };

  const handleDuplicate = async card => {
    try {
      const duplicate = await loyaltyProgramService.duplicate(card.id);
      showToast("Se creó un borrador duplicado.");
      await Promise.all([query.refresh(), allPrograms.refresh()]);
      navigate(`/panel/tarjetas/${duplicate.id}/editar`);
    } catch (error) {
      showError(error.message);
    }
  };

  const handleDelete = async () => {
    if (!cardToDelete) return;
    try {
      await loyaltyProgramService.remove(cardToDelete.id);
      showToast(`Tarjeta “${cardToDelete.nombre}” eliminada.`);
      setCardToDelete(null);
      query.refresh();
      allPrograms.refresh();
    } catch (error) {
      showError(error.message);
    }
  };

  const createLabel = type === "Todas" ? "" : ` de ${CARD_TYPE_CONFIG[type].label}`;

  return (
    <>
      <PageHeader
        title="Tarjetas"
        summary="Diseña y administra los programas digitales de fidelización para tus clientes."
        actions={<Link className="primary-button" to="/panel/tarjetas/nueva"><Icon name="plus" size={16} />Crear tarjeta</Link>}
      />

      {allPrograms.data ? (
        <div className="stats-grid card-program-stats">
          <KpiCard label="Programas" value={totals.length} icon="card" />
          <KpiCard label="Activos" value={activePrograms} icon="chart" />
          <KpiCard label="Clientes en programas" value={activeCustomers} icon="users" />
          <KpiCard label="Canjes del mes" value={monthlyRedemptions} icon="reward" />
        </div>
      ) : (
        <div className="stats-grid card-program-stats">{[0, 1, 2, 3].map(index => <Skeleton key={index} height={95} radius={13} />)}</div>
      )}

      <article className="panel card-gallery-panel">
        <div className="card-type-tabs" role="tablist" aria-label="Filtrar tarjetas por tipo">
          {[{ value: "Todas", label: "Todas" }, ...CARD_TYPE_KEYS.map(cardType => ({ value: cardType, label: CARD_TYPE_CONFIG[cardType].label }))].map((tab, index, tabs) => (
            <button
              type="button"
              role="tab"
              key={tab.value}
              tabIndex={type === tab.value ? 0 : -1}
              aria-selected={type === tab.value}
              className={type === tab.value ? "selected" : ""}
              onClick={() => updateQuery("tipo", tab.value, "Todas")}
              onKeyDown={event => {
                const nextIndex = event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index - 1 + tabs.length) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : -1;
                if (nextIndex < 0) return;
                event.preventDefault();
                const nextTab = tabs[nextIndex];
                updateQuery("tipo", nextTab.value, "Todas");
                event.currentTarget.parentElement.children[nextIndex]?.focus();
              }}
            >
              {tab.label} <span>{tab.value === "Todas" ? totals.length : allPrograms.data ? countOf(tab.value) : "…"}</span>
            </button>
          ))}
        </div>

        <div className="card-gallery-toolbar">
          <SearchInput value={search} onSearch={value => updateQuery("q", value)} label="Buscar por nombre de tarjeta o local" placeholder="Buscar tarjeta o local" />
          <FilterSelect value={status} onChange={value => updateQuery("estado", value, "Todos")} options={STATUS_OPTIONS} label="Filtrar tarjetas por estado" />
          <FilterSelect value={order} onChange={value => updateQuery("orden", value, "recent")} options={SORT_OPTIONS} label="Ordenar tarjetas" />
        </div>

        {query.error && !query.data ? (
          <ErrorState error={query.error} onRetry={query.reload} />
        ) : !query.data ? (
          <div className="cards-grid">{[0, 1, 2, 3].map(index => <Skeleton key={index} height={330} radius={16} />)}</div>
        ) : cards.length ? (
          <div className="card-gallery-groups">
            {groupedCards.map(({ type: cardType, cards: group }) => (
              <section className={`card-gallery-group card-gallery-group-${cardType.toLowerCase()}`} key={cardType} aria-labelledby={`card-group-${cardType.toLowerCase()}`}>
                <header className="card-gallery-group-heading">
                  <div>
                    <span className="card-gallery-group-icon"><Icon name={CARD_TYPE_CONFIG[cardType].icon} size={18} /></span>
                    <div>
                      <h2 id={`card-group-${cardType.toLowerCase()}`}>{CARD_TYPE_CONFIG[cardType].label}</h2>
                      <p>{CARD_TYPE_CONFIG[cardType].description}</p>
                    </div>
                  </div>
                  <span>{group.length} {group.length === 1 ? "programa" : "programas"}</span>
                </header>
                <div className="cards-grid card-gallery-grid">
                  {group.map(card => <CardTile key={card.id} card={card} onStatusChange={handleStatusChange} onDuplicate={handleDuplicate} onDelete={setCardToDelete} />)}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <EmptyState
            message={`No hay tarjetas${type === "Todas" ? "" : ` de ${CARD_TYPE_CONFIG[type].label}`} que coincidan con estos filtros.`}
            actionLabel={`Crear tarjeta${createLabel}`}
            onAction={() => navigate(`/panel/tarjetas/nueva${type === "Todas" ? "" : `?tipo=${encodeURIComponent(type)}`}`)}
          />
        )}
      </article>

      <ConfirmDialog
        open={Boolean(cardToDelete)}
        title="Eliminar tarjeta"
        description={cardToDelete ? `¿Quieres eliminar “${cardToDelete.nombre}”? Los clientes ya no podrán consultar este programa.` : ""}
        confirmLabel="Eliminar tarjeta"
        onConfirm={handleDelete}
        onClose={() => setCardToDelete(null)}
      />
    </>
  );
}
