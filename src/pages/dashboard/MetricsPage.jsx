import { Link, useSearchParams } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";
import { KpiCard } from "../../components/common/KpiCard";
import { PanelHeading } from "../../components/common/PanelHeading";
import { BarList } from "../../components/common/BarList";
import { Avatar } from "../../components/common/Avatar";
import { ErrorState } from "../../components/common/ErrorState";
import { KpiSkeletonGrid, Skeleton } from "../../components/common/Skeleton";
import { ActivityChart } from "../../components/charts/ActivityChart";
import { useFetch } from "../../hooks/useFetch";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { metricsService } from "../../services/metricsService";
import { formatDate, formatMoney, timeAgo } from "../../utils/format";

const PERIODS = {
  month: { label: "Este mes", title: "Este mes", comparison: "el mismo periodo del mes pasado" },
  quarter: { label: "Últimos 3 meses", title: "En los últimos 3 meses", comparison: "el mismo periodo de los tres meses previos" },
  year: { label: "Este año", title: "Este año", comparison: "el mismo periodo del año pasado" }
};

function percentageChange(current, previous) {
  if (!previous) return current ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

export default function MetricsPage() {
  useDocumentTitle("Métricas");
  const [searchParams, setSearchParams] = useSearchParams();
  const period = PERIODS[searchParams.get("periodo")] ? searchParams.get("periodo") : "month";
  const metric = searchParams.get("mostrar") === "visitas" ? "visitas" : "ventas";
  const { data, error, loading, reload } = useFetch(({ signal }) => metricsService.getDashboard({ period, metric }, { signal }), [period, metric]);

  const updateParam = (key, value, defaultValue) =>
    setSearchParams(previous => {
      const next = new URLSearchParams(previous);
      if (value === defaultValue) next.delete(key);
      else next.set(key, value);
      return next;
    }, { replace: true });

  const { title, comparison } = PERIODS[period];
  const salesChange = data ? percentageChange(data.current.sales, data.previous.sales) : 0;
  const changeWord = salesChange === 0 ? "igual" : salesChange > 0 ? "más" : "menos";
  const summary = data ? `${title} tus clientes compraron ${formatMoney(data.current.sales)}, ${changeWord} que ${comparison}.` : "Calculando la actividad de tu programa…";
  const recentActivity = data?.recentActivity ?? (data?.recentCustomers ?? []).map(customer => ({
    id: customer.id,
    clienteId: customer.id,
    nombre: customer.nombre,
    iniciales: customer.iniciales,
    local: customer.tarjeta,
    distrito: customer.distrito,
    fecha: customer.ultimaVisita,
    monto: null
  }));

  if (error && !data) {
    return (
      <>
        <PageHeader title="Métricas" />
        <ErrorState error={error} onRetry={reload} />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Métricas" summary={summary} />
      {data ? (
        <div className="stats-grid">
          <KpiCard label="Ventas con tarjeta" value={formatMoney(data.current.sales)} change={salesChange} comparisonLabel={comparison} icon="chart" />
          <KpiCard label="Clientes activos" value={data.current.customers} change={percentageChange(data.current.customers, data.previous.customers)} comparisonLabel={comparison} icon="users" />
          <KpiCard label="Premios canjeados" value={data.current.rewards} change={percentageChange(data.current.rewards, data.previous.rewards)} comparisonLabel={comparison} icon="reward" />
          <KpiCard label="Clientes que volvieron" value={`${data.current.returnRate.toFixed(1)}%`} change={percentageChange(data.current.returnRate, data.previous.returnRate)} comparisonLabel={comparison} icon="visits" />
        </div>
      ) : (
        <KpiSkeletonGrid />
      )}

      <div className="metrics-toolbar">
        <label htmlFor="period-select">Periodo</label>
        <select className="select-control" id="period-select" value={period} onChange={event => updateParam("periodo", event.target.value, "month")}>
          {Object.entries(PERIODS).map(([value, option]) => (
            <option key={value} value={value}>
              {option.label}
            </option>
          ))}
        </select>
        <label htmlFor="metric-select">Mostrar</label>
        <select className="select-control" id="metric-select" value={metric} onChange={event => updateParam("mostrar", event.target.value, "ventas")}>
          <option value="ventas">Ventas</option>
          <option value="visitas">Visitas</option>
        </select>
        {loading && data && <span className="toolbar-status">Actualizando…</span>}
      </div>

      <article className="panel metrics-activity-panel">
        <PanelHeading title="Actividad del programa" subtitle={`${title} · ${metric === "ventas" ? "ventas en soles" : "visitas registradas"}`} />
        {data ? <ActivityChart series={data.series} metric={metric} period={period} /> : <Skeleton height={190} radius={10} />}
      </article>

      {data ? (
        <article className="panel activity-recent-panel">
          <PanelHeading title="Actividad reciente" subtitle="Últimas compras registradas">
            <Link className="text-button" to="/panel/clientes">
              Ver clientes
            </Link>
          </PanelHeading>
          {recentActivity.length ? (
            <div className="table-wrap activity-recent-table">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Actividad</th>
                    <th>Local</th>
                    <th>Importe</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivity.map(activity => (
                    <tr key={activity.id}>
                      <td className="activity-customer-cell">
                        <Avatar name={activity.nombre} initials={activity.iniciales} />
                        <Link className="customer-link" to={`/panel/clientes/${activity.clienteId}`}>
                          {activity.nombre}
                        </Link>
                      </td>
                      <td>Compra registrada</td>
                      <td>
                        <span className="activity-location">{activity.local}</span>
                        <small className="activity-district">{activity.distrito}</small>
                      </td>
                      <td>{activity.monto === null ? "—" : formatMoney(activity.monto)}</td>
                      <td title={activity.fecha ? formatDate(activity.fecha) : undefined}>{activity.fecha ? timeAgo(activity.fecha) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">Aún no hay actividad reciente para mostrar.</div>
          )}
        </article>
      ) : (
        <article className="panel activity-recent-panel">
          <PanelHeading title="Actividad reciente" />
          <Skeleton height={180} radius={10} />
        </article>
      )}

      {data && (
        <div className="dashboard-grid metrics-secondary-grid">
          <article className="panel">
            <PanelHeading title="Clientes por tipo de negocio" subtitle={`${data.totalCustomers} personas en tu programa`} />
            <BarList items={data.categories.map(category => ({ label: category.name, value: category.count, share: category.share }))} emptyMessage="Agrega clientes para ver la distribución." />
          </article>
          <article className="panel">
            <PanelHeading title="Locales con más clientes" subtitle={`Los ${data.topLocations.length} locales de tu programa`} />
            <BarList items={data.topLocations.map(location => ({ label: location.name, value: location.count }))} />
          </article>
          <article className="panel weekly-actions">
            <PanelHeading title="Qué hacer esta semana" subtitle="Sugerencias basadas en la actividad de tus clientes" />
            {data.suggestions.length ? (
              <ul>
                {data.suggestions.map(item => (
                  <li key={item.text}>
                    <span>{item.text}</span>
                    <Link className="text-button" to={item.to}>
                      {item.action}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">Todo está al día. Sigue cuidando la experiencia de tus clientes.</div>
            )}
          </article>
        </div>
      )}
    </>
  );
}
