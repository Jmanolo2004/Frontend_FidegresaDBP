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
import { formatMoney, timeAgo } from "../../utils/format";

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
          <KpiCard label="Ventas con tarjeta" value={formatMoney(data.current.sales)} change={salesChange} comparisonLabel={comparison} explanation="Compras registradas en el periodo seleccionado." icon="chart" />
          <KpiCard label="Clientes activos" value={data.current.customers} change={percentageChange(data.current.customers, data.previous.customers)} comparisonLabel={comparison} explanation="Personas con una visita en los últimos 60 días." icon="users" />
          <KpiCard label="Premios canjeados" value={data.current.rewards} change={percentageChange(data.current.rewards, data.previous.rewards)} comparisonLabel={comparison} explanation="Recompensas registradas en este periodo." icon="reward" />
          <KpiCard label="Clientes que volvieron" value={`${data.current.returnRate.toFixed(1)}%`} change={percentageChange(data.current.returnRate, data.previous.returnRate)} comparisonLabel={comparison} explanation="Clientes con dos o más visitas en el periodo." icon="visits" />
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

      <div className="dashboard-grid metrics-primary-grid">
        <article className="panel">
          <PanelHeading title="Actividad del programa" subtitle={`${title} · ${metric === "ventas" ? "ventas en soles" : "visitas registradas"}`} />
          {data ? <ActivityChart series={data.series} metric={metric} period={period} /> : <Skeleton height={190} radius={10} />}
        </article>
        <article className="panel weekly-actions">
          <PanelHeading title="Qué hacer esta semana" subtitle="Sugerencias basadas en la actividad de tus clientes" />
          {!data ? (
            <Skeleton height={140} radius={10} />
          ) : data.suggestions.length ? (
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
          <article className="panel recent-panel">
            <PanelHeading title="Clientes recientes" subtitle="Últimas visitas registradas">
              <Link className="text-button" to="/panel/clientes">
                Ver todos
              </Link>
            </PanelHeading>
            <ul className="recent-list">
              {data.recentCustomers.map(customer => (
                <li key={customer.id}>
                  <Avatar name={customer.nombre} initials={customer.iniciales} />
                  <Link className="recent-copy" to={`/panel/clientes/${customer.id}`}>
                    <strong>{customer.nombre}</strong>
                    <small>
                      {customer.tarjeta} · {customer.distrito}
                    </small>
                  </Link>
                  <span className="recent-date">{timeAgo(customer.ultimaVisita)}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      )}
    </>
  );
}
