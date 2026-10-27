import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";
import { KpiCard } from "../../components/common/KpiCard";
import { PanelHeading } from "../../components/common/PanelHeading";
import { Avatar } from "../../components/common/Avatar";
import { StatusPill } from "../../components/common/StatusPill";
import { Stars } from "../../components/common/Stars";
import { Icon } from "../../components/common/Icon";
import { ErrorState } from "../../components/common/ErrorState";
import { PageSkeleton } from "../../components/common/Skeleton";
import { LoyaltyCard } from "../../components/cards/LoyaltyCard";
import { useFetch } from "../../hooks/useFetch";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { customerService } from "../../services/customerService";
import { formatDate, formatMoney, timeAgo } from "../../utils/format";

export default function CustomerDetailPage() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const { data: customer, error, reload } = useFetch(({ signal }) => customerService.getById(customerId, { signal }), [customerId]);
  useDocumentTitle(customer?.nombre || "Cliente");

  if (error) {
    return (
      <>
        <PageHeader title={error.status === 404 ? "Cliente no encontrado" : "Cliente"} summary={error.status === 404 ? "Puede que el enlace sea incorrecto o que el cliente ya no exista." : undefined} />
        {error.status === 404 ? (
          <div className="panel embedded-not-found">
            <p>No encontramos a un cliente con el código #{customerId}.</p>
            <button type="button" className="primary-button" onClick={() => navigate("/panel/clientes")}>
              Volver a clientes
            </button>
          </div>
        ) : (
          <ErrorState error={error} onRetry={reload} />
        )}
      </>
    );
  }
  if (!customer) return <PageSkeleton />;

  const card = customer.tarjetaPrograma;
  const stampsGoal = card?.estampillas || 10;

  return (
    <>
      <Link className="back-link" to="/panel/clientes">
        <Icon name="chevronLeft" size={15} /> Volver a clientes
      </Link>
      <PageHeader
        title={customer.nombre}
        summary={`Cliente desde ${formatDate(customer.fechaRegistro, { month: "long", year: "numeric" })} · ${customer.localNombre} · ${customer.distrito}`}
        actions={<StatusPill variant={customer.estado === "Inactiva" ? "inactive" : "active"}>{customer.estado === "Activa" ? "Cliente activo" : "Cliente inactivo"}</StatusPill>}
      />

      <div className="stats-grid">
        <KpiCard label="Visitas" value={customer.visitas} explanation="Visitas registradas con su tarjeta." icon="visits" />
        <KpiCard label="Total comprado" value={formatMoney(customer.totalGastado)} explanation="Compras registradas en el programa." icon="chart" />
        <KpiCard label="Premios canjeados" value={customer.premiosCanjeados} explanation="Recompensas obtenidas hasta hoy." icon="reward" />
        <KpiCard
          label={card?.tipo === "Cashback" ? "Saldo cashback" : "Estampillas"}
          value={card?.tipo === "Cashback" ? formatMoney(customer.saldoCashback) : `${customer.estampillas}/${stampsGoal}`}
          explanation={card?.tipo === "Cashback" ? "Saldo disponible para su próxima visita." : "Progreso hacia su próxima recompensa."}
          icon="star"
        />
      </div>

      <div className="dashboard-grid customer-detail-grid">
        <article className="panel">
          <PanelHeading title="Datos de contacto" subtitle="Información registrada por el cliente" />
          <div className="customer-profile">
            <Avatar name={customer.nombre} initials={customer.iniciales} className="customer-avatar large" />
            <dl className="detail-list">
              <div>
                <dt>
                  <Icon name="mail" size={15} /> Correo
                </dt>
                <dd>
                  <a href={`mailto:${customer.correo}`}>{customer.correo}</a>
                </dd>
              </div>
              <div>
                <dt>
                  <Icon name="phone" size={15} /> Teléfono
                </dt>
                <dd>{customer.telefono || "Sin teléfono"}</dd>
              </div>
              <div>
                <dt>
                  <Icon name="pin" size={15} /> Local
                </dt>
                <dd>
                  {customer.localNombre} · {customer.distrito}
                </dd>
              </div>
              <div>
                <dt>
                  <Icon name="visits" size={15} /> Cumpleaños
                </dt>
                <dd>{customer.cumpleanos || "No registrado"}</dd>
              </div>
            </dl>
          </div>
        </article>
        <article className="panel">
          <PanelHeading title="Tarjeta digital" subtitle="Así ve su tarjeta en el celular" />
          {card ? <LoyaltyCard card={card} /> : <div className="empty-state">Este cliente aún no tiene una tarjeta asignada.</div>}
        </article>
      </div>

      <div className="dashboard-grid customer-detail-grid">
        <article className="panel">
          <PanelHeading title="Visitas recientes" subtitle="Últimas compras registradas con la tarjeta" />
          {customer.visitasRecientes.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Monto</th>
                    <th>Premio</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.visitasRecientes.map(visit => (
                    <tr key={visit.id}>
                      <td>{formatDate(visit.fecha)}</td>
                      <td>{formatMoney(visit.monto)}</td>
                      <td>{visit.premioCanjeado ? <StatusPill>Canjeado</StatusPill> : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">Todavía no hay visitas registradas.</div>
          )}
        </article>
        <article className="panel">
          <PanelHeading title="Sus reseñas" subtitle="Opiniones que compartió con tu negocio" />
          {customer.resenas.length ? (
            <ul className="mini-review-list">
              {customer.resenas.map(review => (
                <li key={review.id}>
                  <div className="review-top">
                    <Stars score={review.calificacion} />
                    <span className="review-date">{timeAgo(review.fecha)}</span>
                  </div>
                  <p>{review.comentario}</p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state">Este cliente aún no ha dejado reseñas.</div>
          )}
        </article>
      </div>
    </>
  );
}
