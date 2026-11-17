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

export function ActivityTable({ program, branchId, from, to }) {
  const pagination = usePagination({ actType: "all" }, { preventScrollReset: true });
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

  const events = ["all", "Se registró", "+1 sello", "Canjeó premio", "Consultó su tarjeta", "Usó cashback", "Subió de nivel", "Compró gift card", "Registró una visita"];
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
          <select className="filter-select" value={pagination.filters.actType} onChange={event => pagination.setFilter("actType", event.target.value)}>
            {events.map(event => <option key={event} value={event}>{event === "all" ? "Todos los eventos" : event}</option>)}
          </select>
        </label>
        <span className="metrics-updated" aria-live="polite">{updatedText}</span>
      </div>
      {loading && !data ? <Skeleton height={280} /> : data?.content?.length ? <>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Cliente y local</th><th>Evento</th><th>Importe</th><th>Cuándo</th></tr></thead>
            <tbody>{data.content.map(item => (
              <tr key={item.id}>
                <td data-label="Cliente y local"><div className="metrics-customer">
                  <Avatar name={item.customerName} initials={item.initials} />
                  <span><Link className="customer-link" to={`/panel/clientes/${item.customerId}`}>{item.customerName}</Link><small>{item.branch}</small></span>
                </div></td>
                <td data-label="Evento">{item.event}</td>
                <td data-label="Importe">{
                  item.amount == null || item.amount === "" || !Number.isFinite(Number(item.amount))
                    ? item.event === "Se registró" ? "Sin compra" : "Sin importe"
                    : Number(item.amount) === 0 ? "Sin compra" : formatMoney(item.amount)
                }</td>
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
