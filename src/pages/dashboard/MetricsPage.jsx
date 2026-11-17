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

const PROGRAMS = [["all", "General"], ["stamps", "Estampillas"], ["cashback", "Cashback"], ["giftcard", "Giftcards"], ["tiers", "Niveles"]];

function MetricContent({ data }) {
  const { kpis, series } = data;
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
      <div className="panel-heading">
        <div>
          <h3>Clientes Nuevos y Total de Visitas</h3>
          <p>Comparativa en barras de visitas totales frente a clientes nuevos para observar la recurrencia.</p>
        </div>
      </div>
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

MetricContent.propTypes = { data: PropTypes.object.isRequired };

export default function MetricsPage() {
  useDocumentTitle("Métricas");
  const { branches, branchesError, reloadBranches } = useOutletContext();
  const { filters, update, invalidCustomRange } = useMetricsFilters();
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
  if (error && !data) return <><PageHeader title="Métricas" /><ErrorState error={error} onRetry={reload} /></>;
  if (branchesError && !branches.length) return <><PageHeader title="Métricas" /><ErrorState error={branchesError} onRetry={reloadBranches} /></>;

  return <>
    <PageHeader title={`Hola, ${data?.owner || "bienvenido"}`} summary="En esta sección podrás analizar el comportamiento de tus clientes y el rendimiento de tu negocio." />
    <div className="metrics-controls-row">
      <div className="metrics-program-filters" role="group" aria-label="Filtrar métricas por programa">
        {PROGRAMS.map(([value, label]) => (
          <button type="button" key={value} className="metrics-calendar-trigger" aria-pressed={filters.program === value} onClick={() => update({ program: value })}>
            {label}
          </button>
        ))}
      </div>
      <MetricsFilters filters={filters} update={update} />
    </div>
    {invalidCustomRange && <p role="alert">El rango de fechas del enlace no es válido. Se muestran las métricas de este año; selecciona otro rango para corregirlo.</p>}
    {error && <ErrorState error={error} onRetry={reload} />}
    {loading && data && <p className="metrics-loading-note" role="status">Actualizando indicadores…</p>}
    {!error && (data
      ? <MetricContent data={data} />
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
