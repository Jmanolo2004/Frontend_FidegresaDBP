import { useState } from "react";
import PropTypes from "prop-types";
import { Link, useLoaderData, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CardFlip } from "../../components/cards/CardFlip";
import { PhoneMockup } from "../../components/cards/PhoneMockup";
import { Avatar } from "../../components/common/Avatar";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { EmptyState } from "../../components/common/EmptyState";
import { ErrorState } from "../../components/common/ErrorState";
import { KpiCard } from "../../components/common/KpiCard";
import { PageHeader } from "../../components/common/PageHeader";
import { PanelHeading } from "../../components/common/PanelHeading";
import { Pagination } from "../../components/common/Pagination";
import { Skeleton } from "../../components/common/Skeleton";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useFetch } from "../../hooks/useFetch";
import { usePagination } from "../../hooks/usePagination";
import { useToast } from "../../hooks/useToast";
import { loyaltyProgramService } from "../../services/loyaltyProgramService";
import { formatDate, formatMoney, timeAgo } from "../../utils/format";
import { CARD_TYPE_CONFIG } from "../../components/cards/cardTypes";

const TABS = [
  { id: "resumen", label: "Resumen" },
  { id: "reglas", label: "Reglas" },
  { id: "clientes", label: "Clientes" },
  { id: "cliente", label: "Vista del cliente" }
];

function ruleDescription(card) {
  const rules = card.reglas;
  if (card.tipo === "Estampillas") {
    const earning = rules.selloPor === "compra mínima" ? `una compra desde ${formatMoney(rules.montoMinimo)}` : "cada visita";
    const dailyStamp = rules.limitePorDia === 1 ? "sello" : "sellos";
    return `El cliente gana 1 sello por ${earning}; al juntar ${rules.sellosMeta} recibe ${rules.premio}. Puede recibir hasta ${rules.limitePorDia} ${dailyStamp} al día.`;
  }
  if (card.tipo === "Cashback") return `Cada compra devuelve ${rules.porcentaje}% como saldo, hasta ${formatMoney(rules.topeMensual)} al mes. El saldo se puede canjear desde ${formatMoney(rules.saldoMinimoCanje)} y vence en ${rules.expiraDias} días.`;
  if (card.tipo === "Niveles") return `El cliente suma ${rules.puntosPorSol} ${rules.puntosPorSol === 1 ? "punto" : "puntos"} por cada sol gastado. Al alcanzar los puntos requeridos, desbloquea el beneficio de cada nivel.`;
  return `La tarjeta se puede comprar por ${rules.montos.map(amount => formatMoney(amount)).join(", ")}${rules.permiteMontoLibre ? ` o por un monto personalizado entre ${formatMoney(rules.montoMin)} y ${formatMoney(rules.montoMax)}` : ""}. Vence en ${rules.vigenciaMeses} meses.`;
}

function RulesPanel({ card }) {
  const rules = card.reglas;
  return (
    <article className="panel card-detail-panel">
      <PanelHeading title="Cómo funciona" subtitle="Reglas explicadas para compartirlas con tus clientes" />
      <p className="card-rule-summary">{ruleDescription(card)}</p>
      {card.tipo === "Niveles" && (
        <ol className="card-detail-levels">
          {rules.niveles.map((level, index) => <li key={`${level.nombre}-${index}`}><span className="card-level-dot" style={{ backgroundColor: level.color }} /><strong>{level.nombre}</strong><span>Desde {level.desdePuntos} puntos</span><em>{level.beneficio}</em></li>)}
        </ol>
      )}
      {card.tipo === "Giftcard" && <p className="card-detail-message">“{rules.mensajeRegalo}”</p>}
      {card.terminos && <div className="card-detail-terms"><h3>Términos y condiciones</h3><p>{card.terminos}</p></div>}
      <p className="card-detail-validity">Vigencia de la tarjeta: {card.vigenciaMeses} meses.</p>
    </article>
  );
}

RulesPanel.propTypes = { card: PropTypes.object.isRequired };

export default function CardDetailPage() {
  const loadedCard = useLoaderData();
  const { programId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast, showError } = useToast();
  const [card, setCard] = useState(loadedCard);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const activeTab = TABS.some(tab => tab.id === searchParams.get("vista")) ? searchParams.get("vista") : "resumen";
  const pagination = usePagination();
  const customerPage = useFetch(({ signal }) => loyaltyProgramService.getCustomers(programId, { page: pagination.page, size: pagination.size }, { signal }), [programId, pagination.page, pagination.size], { enabled: activeTab === "clientes" });
  useDocumentTitle(card?.nombre || "Tarjeta");

  if (loadedCard?.notFound) {
    return <EmptyState message="No encontramos la tarjeta que buscas. Puede que se haya eliminado." actionLabel="Volver a tarjetas" onAction={() => navigate("/panel/tarjetas")} />;
  }
  if (!card) return <Skeleton height={380} radius={14} />;

  const updateTab = tab => {
    setSearchParams(previous => {
      const next = new URLSearchParams(previous);
      if (tab === "resumen") next.delete("vista");
      else next.set("vista", tab);
      next.delete("page");
      next.delete("size");
      return next;
    });
  };

  const updateStatus = async () => {
    const nextStatus = card.estado === "Activa" ? "En pausa" : "Activa";
    try {
      const updated = await loyaltyProgramService.setStatus(card.id, nextStatus);
      setCard(updated);
      showToast(`La tarjeta está ${nextStatus.toLowerCase()}.`);
    } catch (error) {
      showError(error.message);
    }
  };

  const duplicate = async () => {
    try {
      const copy = await loyaltyProgramService.duplicate(card.id);
      showToast("Se creó un borrador duplicado.");
      navigate(`/panel/tarjetas/${copy.id}/editar`);
    } catch (error) {
      showError(error.message);
    }
  };

  const removeCard = async () => {
    try {
      await loyaltyProgramService.remove(card.id);
      showToast("Tarjeta eliminada.");
      navigate("/panel/tarjetas");
    } catch (error) {
      showError(error.message);
    }
  };

  const metrics = card.metricas || {};

  return (
    <>
      <PageHeader
        title={card.nombre}
        summary={`${CARD_TYPE_CONFIG[card.tipo]?.label || card.tipo} · ${card.negocio}`}
        actions={
          <div className="card-detail-actions">
            <Link className="secondary-button" to={`/panel/tarjetas/${card.id}/editar`}>Editar</Link>
            <button type="button" className="secondary-button" onClick={duplicate}>Duplicar</button>
            <button type="button" className="secondary-button" onClick={updateStatus}>{card.estado === "Activa" ? "Pausar" : "Activar"}</button>
            <button type="button" className="danger-button" onClick={() => setDeleteOpen(true)}>Eliminar</button>
          </div>
        }
      />

      <div className="card-detail-hero">
        <CardFlip card={card} size="lg" />
        <div className="card-detail-hero-copy">
          <span className={`program-status ${card.estado === "Activa" ? "active" : card.estado === "En pausa" ? "paused" : "draft"}`}><i />{card.estado}</span>
          <h2>{card.nombre}</h2>
          <p>{card.descripcion || "Programa de fidelización para tus clientes."}</p>
          <p><strong>Local:</strong> {card.negocio}</p>
          <p><strong>Creada:</strong> {formatDate(card.creadaEn)}</p>
        </div>
      </div>

      <div className="card-detail-tabs" role="tablist" aria-label="Información de la tarjeta">
        {TABS.map(tab => <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} onClick={() => updateTab(tab.id)}>{tab.label}</button>)}
      </div>

      {activeTab === "resumen" && (
        <div className="card-detail-content">
          <div className="stats-grid card-detail-kpis">
            <KpiCard label="Clientes activos" value={metrics.clientesActivos || 0} icon="users" />
            <KpiCard label="Tarjetas emitidas" value={metrics.emitidas || 0} icon="card" />
            <KpiCard label="Canjes" value={metrics.canjes || 0} icon="reward" />
            <KpiCard label="Tasa de canje" value={`${metrics.tasaCanje || 0}%`} icon="chart" />
            <KpiCard label="Ventas asociadas" value={formatMoney(metrics.ventasAsociadas || 0)} icon="chart" />
          </div>
          <div className="dashboard-grid card-detail-summary-grid">
            <article className="panel">
              <PanelHeading title="Progreso promedio" subtitle="Avance de los clientes en esta tarjeta" />
              <div className="card-progress-meter" role="progressbar" aria-valuenow={metrics.progresoPromedio || 0} aria-valuemin={0} aria-valuemax={100} aria-label="Progreso promedio de los clientes">
                <span style={{ width: `${Math.min(100, metrics.progresoPromedio || 0)}%` }} />
              </div>
              <strong className="card-progress-value">{metrics.progresoPromedio || 0}%</strong>
            </article>
            <article className="panel">
              <PanelHeading title="Últimos canjes" subtitle="Recompensas registradas" />
              {metrics.ultimosCanjes?.length ? (
                <ul className="card-redemption-list">
                  {metrics.ultimosCanjes.map(redemption => (
                    <li key={redemption.id}>
                      <Avatar name={redemption.cliente} />
                      <Link to={`/panel/clientes/${redemption.clienteId}`}>{redemption.cliente}</Link>
                      <span>{formatMoney(redemption.monto)} · {timeAgo(redemption.fecha)}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="card-detail-empty">Todavía no hay canjes registrados.</p>}
            </article>
          </div>
        </div>
      )}

      {activeTab === "reglas" && <RulesPanel card={card} />}

      {activeTab === "clientes" && (
        <article className="panel card-detail-panel">
          <PanelHeading title="Clientes de esta tarjeta" subtitle={`${customerPage.data?.totalElements || 0} personas asociadas al local`} />
          {customerPage.error ? (
            <ErrorState error={customerPage.error} onRetry={customerPage.reload} compact />
          ) : !customerPage.data ? (
            <Skeleton height={220} radius={9} />
          ) : customerPage.data.content.length ? (
            <>
              <div className="table-wrap">
                <table className="data-table card-customer-table">
                  <thead><tr><th>Cliente</th><th>Correo</th><th>Progreso o saldo</th><th>Última visita</th></tr></thead>
                  <tbody>{customerPage.data.content.map(customer => (
                    <tr key={customer.id}>
                      <td><span className="cell-inline"><Avatar name={customer.nombre} initials={customer.iniciales} /><Link className="customer-link" to={`/panel/clientes/${customer.id}`}>{customer.nombre}</Link></span></td>
                      <td>{customer.correo || "Sin correo"}</td>
                      <td>{customer.progreso}</td>
                      <td title={formatDate(customer.ultimaVisita)}>{timeAgo(customer.ultimaVisita)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              <Pagination page={customerPage.data.number} totalPages={customerPage.data.totalPages} totalElements={customerPage.data.totalElements} size={customerPage.data.size} onPageChange={pagination.setPage} onSizeChange={pagination.setSize} itemLabel="clientes" />
            </>
          ) : <EmptyState message="Aún no hay clientes asociados a esta tarjeta." />}
        </article>
      )}

      {activeTab === "cliente" && <article className="panel card-detail-panel"><PanelHeading title="En el celular del cliente" subtitle="Vista ilustrativa de la tarjeta digital" /><PhoneMockup card={card} /></article>}

      <ConfirmDialog open={deleteOpen} title="Eliminar tarjeta" description={`¿Quieres eliminar “${card.nombre}”? Esta acción no se puede deshacer.`} confirmLabel="Eliminar tarjeta" onConfirm={removeCard} onClose={() => setDeleteOpen(false)} />
    </>
  );
}
