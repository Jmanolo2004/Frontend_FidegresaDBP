import { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { Avatar } from "../common/Avatar";
import { EmptyState } from "../common/EmptyState";
import { ErrorState } from "../common/ErrorState";
import { Pagination } from "../common/Pagination";
import { Skeleton } from "../common/Skeleton";
import { useFetch } from "../../hooks/useFetch";
import { usePagination } from "../../hooks/usePagination";
import { metricsService } from "../../services/metricsService";
import { formatMoney, formatDate, timeAgo } from "../../utils/format";

const PROGRAM_COLOR = { Estampillas: "#603f2a", Cashback: "#c8894f", Niveles: "#4e8066", Giftcard: "#8a5a7a" };

export function ActivityTable({ program, branchId, from, to }) {
  const pagination = usePagination({ actType: "all" });
  const [updatedAt, setUpdatedAt] = useState(Date.now());
  const request = useMemo(() => ({
    page: pagination.page,
    size: pagination.size,
    program: program === "all" ? "all" : program,
    branchId: branchId || "",
    type: pagination.filters.actType,
    from,
    to
  }), [pagination.page, pagination.size, pagination.filters.actType, program, branchId, from, to]);
  const fetchActivity = useCallback(({ signal }) => metricsService.getActivity(request, { signal }), [request]);
  const { data, error, loading, reload, refresh } = useFetch(fetchActivity, [request]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        refresh().then(result => { if (result) setUpdatedAt(Date.now()); });
      }
    }, 60000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") refresh().then(result => { if (result) setUpdatedAt(Date.now()); });
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refresh]);

  const events = ["all", "Se registró", "+1 sello", "Canjeó premio", "Usó cashback", "Subió de nivel", "Compró gift card", "Registró una visita"];
  const updatedMinutes = Math.floor((Date.now() - updatedAt) / 60000);
  const updatedText = updatedMinutes < 1
    ? "Actualizado hace menos de 1 min"
    : updatedMinutes < 60
      ? `Actualizado hace ${updatedMinutes} min`
      : updatedMinutes < 1440
        ? `Actualizado hace ${Math.floor(updatedMinutes / 60)} h`
        : `Actualizado ${timeAgo(new Date(updatedAt).toISOString())}`;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;

  return (
    <div className="metrics-activity-table">
      <div className="metrics-activity-filters">
        <label>Evento
          <select value={pagination.filters.actType} onChange={event => pagination.setFilter("actType", event.target.value)}>
            {events.map(event => <option key={event} value={event}>{event === "all" ? "Todos los eventos" : event}</option>)}
          </select>
        </label>
        <span className="metrics-updated" aria-live="polite">{updatedText}</span>
      </div>
      {loading && !data ? <Skeleton height={280} /> : data?.content?.length ? <>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Cliente y local</th><th>Programa y tarjeta</th><th>Evento</th><th>Importe</th><th>Señal</th><th>Cuándo</th></tr></thead>
            <tbody>{data.content.map(item => (
              <tr key={item.id}>
                <td data-label="Cliente y local"><div className="metrics-customer">
                  <Avatar name={item.customerName} initials={item.initials} />
                  <span><Link className="customer-link" to={`/panel/clientes/${item.customerId}`}>{item.customerName}</Link><small>{item.branch}</small></span>
                </div></td>
                <td data-label="Programa y tarjeta"><Link className="metrics-program-chip" style={{ "--program-accent": PROGRAM_COLOR[item.program] }} to={item.cardId ? `/panel/tarjetas/${item.cardId}` : "/panel/tarjetas"}>{item.cardName}
                  {item.program === "Estampillas" ? <span className="metrics-progress"><i style={{ width: `${Math.min(100, item.progress / item.target * 100)}%` }} />{item.progress} de {item.target}</span>
                    : item.program === "Cashback" ? <small>Saldo {formatMoney(item.balance)}</small>
                      : item.program === "Niveles" ? <small>Nivel {item.level}</small> : <small>Gift card activa</small>}
                </Link></td>
                <td data-label="Evento">{item.event}</td>
                <td data-label="Importe">{item.amount === null ? "—" : formatMoney(item.amount)}</td>
                <td data-label="Señal">{item.signal ? <span className={`metrics-signal ${item.signal.includes("Riesgo") ? "risk" : item.signal.includes("nuevo") ? "new" : item.signal.includes("Vence") ? "warning" : "positive"}`}>{item.signal}</span> : "—"}</td>
                <td data-label="Cuándo" title={formatDate(item.date)}>{timeAgo(item.date)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <Pagination page={data.number} totalPages={data.totalPages} totalElements={data.totalElements} size={data.size} onPageChange={pagination.setPage} onSizeChange={pagination.setSize} itemLabel="actividades" />
      </> : <EmptyState message="No hay actividad para los filtros seleccionados." />}
    </div>
  );
}

ActivityTable.propTypes = { program: PropTypes.string.isRequired, branchId: PropTypes.string, from: PropTypes.string.isRequired, to: PropTypes.string.isRequired };
