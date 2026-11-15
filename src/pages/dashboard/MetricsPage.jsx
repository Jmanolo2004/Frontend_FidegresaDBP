import { lazy, Suspense, useCallback, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import PropTypes from "prop-types";
import { ActivityTable } from "../../components/metrics/ActivityTable";
import { MetricsFilters } from "../../components/metrics/MetricsFilters";
import { ErrorState } from "../../components/common/ErrorState";
import { PageHeader } from "../../components/common/PageHeader";
import { PanelHeading } from "../../components/common/PanelHeading";
import { Skeleton } from "../../components/common/Skeleton";
import { Icon } from "../../components/common/Icon";
import { useFetch } from "../../hooks/useFetch";
import { useMetricsFilters } from "../../hooks/useMetricsFilters";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { metricsService } from "../../services/metricsService";
import { formatMoney } from "../../utils/format";

const ComboChart = lazy(() => import("../../components/metrics/MetricsVisuals").then(module => ({ default: module.ComboChart })));
const MetricsTrendChart = lazy(() => import("../../components/metrics/MetricsVisuals").then(module => ({ default: module.MetricsTrendChart })));

const DATE_LABELS = { all: "Todo el tiempo", today: "Hoy", "7days": "Los últimos 7 días", "14days": "Los últimos 14 días", "30days": "Los últimos 30 días", "90days": "Los últimos 90 días", month: "Este mes", quarter: "Este trimestre", year: "Este año", custom: "El periodo seleccionado" };
const PROGRAMS = [["all", "General"], ["stamps", "Estampillas"], ["cashback", "Cashback"], ["giftcard", "Giftcards"], ["tiers", "Niveles"]];

function MetricContent({ data, filters }) {
  const { kpis, series } = data;
  const dateTitle = DATE_LABELS[filters.range] || DATE_LABELS.custom;
  const trendSeries = {
    ...series,
    items: series.items.map(item => ({
      ...item,
      clientesRecurrentes: item.clientesRecurrentes ?? null,
      transacciones: item.transacciones ?? null
    }))
  };

  return <>
    <section className="panel metrics-chart-panel metrics-content-section">
      <PanelHeading title="Clientes nuevos y total de visitas" subtitle={`${dateTitle} · ventas disponibles al pasar el cursor`} />
      <Suspense fallback={<Skeleton height={300} />}>
        {series.items.length ? <ComboChart series={series} /> : <div className="metrics-empty-inline">No hay ventas ni visitas en este periodo. Prueba otro rango o local.</div>}
      </Suspense>
    </section>

    <section className="metrics-trends-section metrics-content-section" aria-label="Clientes y actividad">
      <div className="metrics-summary-grid">
        {[
          ["Clientes recurrentes", kpis.returningCustomers ? Math.round(kpis.returningCustomers.current).toLocaleString("es-PE") : "—", "users"],
          ["Total escaneos", Math.round(kpis.visits.current).toLocaleString("es-PE"), "visits"],
          ["Transacciones totales", kpis.transactions ? Math.round(kpis.transactions.current).toLocaleString("es-PE") : "—", "card"],
          ["Ticket promedio cliente", formatMoney(kpis.ticket.current), "target"]
        ].map(([label, value, icon]) => (
          <article className="metrics-summary-card" key={label}>
            <div className="metrics-summary-label"><Icon name={icon} size={16} /><span>{label}</span></div>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <section className="panel metrics-trend-panel">
        <Suspense fallback={<Skeleton height={300} />}>
          <MetricsTrendChart series={trendSeries} />
        </Suspense>
      </section>
    </section>

  </>;
}

MetricContent.propTypes = { data: PropTypes.object.isRequired, filters: PropTypes.object.isRequired };

export default function MetricsPage() {
  useDocumentTitle("Métricas");
  const { branches, branchesError, reloadBranches } = useOutletContext();
  const { filters, update } = useMetricsFilters();
  const overviewParams = useMemo(() => ({
    program: filters.program,
    range: filters.range,
    interval: filters.interval,
    from: filters.from,
    to: filters.to,
    branchId: filters.branchId
  }), [filters.program, filters.range, filters.from, filters.to, filters.branchId, filters.interval]);
  const getOverview = useCallback(({ signal }) => metricsService.getOverview(overviewParams, { signal }), [overviewParams]);
  const { data, error, loading, reload } = useFetch(getOverview, [overviewParams]);
  const dateTitle = DATE_LABELS[filters.range] || DATE_LABELS.custom;
  const summary = data && !error
    ? `${dateTitle}, tus clientes volvieron ${Math.round(data.kpis.visits.current).toLocaleString("es-PE")} veces y gastaron ${formatMoney(data.kpis.sales.current)}.`
    : "Consulta el rendimiento de tus clientes y las ventas de tu negocio.";

  if (error && !data) return <><PageHeader title="Métricas" /><ErrorState error={error} onRetry={reload} /></>;
  if (branchesError && !branches.length) return <><PageHeader title="Métricas" /><ErrorState error={branchesError} onRetry={reloadBranches} /></>;

  return <>
    <PageHeader title={`Hola, ${data?.owner || "bienvenido"}`} summary={summary} />
    <div className="metrics-program-filters" role="group" aria-label="Filtrar métricas por programa">
      {PROGRAMS.map(([value, label]) => (
        <button type="button" key={value} className="metrics-calendar-trigger" aria-pressed={filters.program === value} onClick={() => update({ program: value })}>
          {label}
        </button>
      ))}
    </div>
    <MetricsFilters filters={filters} update={update} />
    {error && <ErrorState error={error} onRetry={reload} />}
    {loading && data && <p className="metrics-loading-note" role="status">Actualizando indicadores…</p>}
    {!error && (data
      ? <MetricContent data={data} filters={filters} />
      : <>
        <Skeleton height={320} />
        <section className="metrics-summary-grid" aria-label="Cargando indicadores">
          {Array.from({ length: 4 }, (_, index) => <Skeleton height={104} key={index} />)}
        </section>
        <Skeleton height={320} />
      </>)}

    <article className="panel metrics-activity-panel metrics-content-section">
      <PanelHeading title="Actividad reciente" subtitle={filters.program === "all" ? "Movimientos de tus clientes en todos los programas" : `Movimientos de tus clientes en ${PROGRAMS.find(([value]) => value === filters.program)[1]}`} />
      <ActivityTable key={filters.program} program={filters.program} branchId={filters.branchId} from={filters.from} to={filters.to} />
    </article>
  </>;
}
