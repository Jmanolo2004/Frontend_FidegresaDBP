import { lazy, Suspense, useCallback, useMemo } from "react";
import { Link, useOutletContext } from "react-router-dom";
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
import { useToast } from "../../hooks/useToast";
import { metricsService } from "../../services/metricsService";
import { formatMoney } from "../../utils/format";

const ComboChart = lazy(() => import("../../components/metrics/MetricsVisuals").then(module => ({ default: module.ComboChart })));
const MetricsTrendChart = lazy(() => import("../../components/metrics/MetricsVisuals").then(module => ({ default: module.MetricsTrendChart })));
const BranchRanking = lazy(() => import("../../components/metrics/MetricsVisuals").then(module => ({ default: module.BranchRanking })));
const StampsPanel = lazy(() => import("../../components/metrics/MetricsVisuals").then(module => ({ default: module.StampsPanel })));
const CashbackPanel = lazy(() => import("../../components/metrics/MetricsVisuals").then(module => ({ default: module.CashbackPanel })));
const TiersPanel = lazy(() => import("../../components/metrics/MetricsVisuals").then(module => ({ default: module.TiersPanel })));
const GiftcardPanel = lazy(() => import("../../components/metrics/MetricsVisuals").then(module => ({ default: module.GiftcardPanel })));

const PROGRAM_COMPONENTS = { stamps: StampsPanel, cashback: CashbackPanel, tiers: TiersPanel, giftcard: GiftcardPanel };
const DATE_LABELS = { today: "Hoy", "7days": "Los últimos 7 días", "30days": "Los últimos 30 días", month: "Este mes", quarter: "Este trimestre", year: "Este año", custom: "El periodo seleccionado" };

function TrendText({ metric, compareLabel }) {
  const trend = metric?.change;
  if (trend === null || trend === undefined) return <span className="metrics-no-comparison" tabIndex={0} title={metric?.explanation || "No hay datos comparables para este periodo."}>—</span>;
  return <span className={trend < 0 ? "trend-down" : "trend-up"} tabIndex={0} title={`Comparado con ${compareLabel}`}>{trend > 0 ? "+" : ""}{trend}% vs. {compareLabel}</span>;
}
TrendText.propTypes = { metric: PropTypes.object, compareLabel: PropTypes.string.isRequired };

function comparisonLabel(filters) {
  const parse = value => {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  };
  const from = parse(filters.from);
  const to = parse(filters.to);
  let comparisonFrom;
  let comparisonTo;

  if (filters.compare === "lastYear") {
    comparisonFrom = new Date(from.getFullYear() - 1, from.getMonth(), from.getDate());
    comparisonTo = new Date(to.getFullYear() - 1, to.getMonth(), to.getDate());
  } else if (filters.range === "month") {
    comparisonFrom = new Date(from.getFullYear(), from.getMonth() - 1, 1);
    comparisonTo = new Date(comparisonFrom.getFullYear(), comparisonFrom.getMonth(), Math.min(to.getDate(), new Date(comparisonFrom.getFullYear(), comparisonFrom.getMonth() + 1, 0).getDate()));
  } else {
    const duration = Math.max(1, Math.round((to - from) / 86400000) + 1);
    comparisonTo = new Date(from);
    comparisonTo.setDate(comparisonTo.getDate() - 1);
    comparisonFrom = new Date(comparisonTo);
    comparisonFrom.setDate(comparisonFrom.getDate() - duration + 1);
  }

  const format = date => new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short" }).format(date).replace(/\./g, "").toLocaleLowerCase("es-PE");
  return comparisonFrom.getMonth() === comparisonTo.getMonth()
    ? `${comparisonFrom.getDate()}–${comparisonTo.getDate()} ${format(comparisonTo)}`
    : `${format(comparisonFrom)}–${format(comparisonTo)}`;
}

function MetricContent({ data, filters }) {
  const { kpis, series, breakdowns, programs } = data;
  const compareLabel = filters.compare === "lastYear" ? "el mismo periodo del año pasado" : "el periodo anterior";
  const dateTitle = DATE_LABELS[filters.range] || DATE_LABELS.custom;
  const ProgramComponent = PROGRAM_COMPONENTS[filters.program];
  const selectedBreakdown = breakdowns.programs.find(item => item.key === filters.program);
  const selectedProgram = programs[filters.program];
  const trendSeries = {
    ...series,
    items: series.items.map(item => ({
      ...item,
      clientesRecurrentes: item.clientesRecurrentes ?? null,
      transacciones: item.transacciones ?? null
    }))
  };

  if (ProgramComponent) {
    return <Suspense fallback={<Skeleton height={430} />}>
      <ProgramComponent data={selectedProgram} cardId={selectedBreakdown?.card?.id} trend={selectedBreakdown?.trend ?? null} compareLabel={compareLabel} />
    </Suspense>;
  }

  return <>
    <section className="panel metrics-chart-panel metrics-content-section">
      <PanelHeading title="Actividad y ventas" subtitle={`${dateTitle} · compara visitas, clientes nuevos y ventas con barras`}>
        <TrendText metric={kpis.sales} compareLabel={compareLabel} />
      </PanelHeading>
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
        <PanelHeading title="Evolución de clientes y actividad" subtitle="Comportamiento por periodo de clientes recurrentes, escaneos y transacciones." />
        <Suspense fallback={<Skeleton height={300} />}>
          <MetricsTrendChart series={trendSeries} />
        </Suspense>
      </section>
    </section>

    <article className="panel metrics-branch-panel metrics-content-section">
      <PanelHeading title="Rendimiento por local" subtitle="Ventas, visitas, retorno y reseña promedio">
        <Link className="text-button" to="/panel/ubicaciones">Ver locales</Link>
      </PanelHeading>
      <Suspense fallback={<Skeleton height={260} />}><BranchRanking branches={breakdowns.branches} /></Suspense>
    </article>

  </>;
}

MetricContent.propTypes = { data: PropTypes.object.isRequired, filters: PropTypes.object.isRequired };

export default function MetricsPage() {
  useDocumentTitle("Métricas");
  const { branches, branchesError, reloadBranches } = useOutletContext();
  const { filters, update } = useMetricsFilters();
  const { showError } = useToast();
  const overviewParams = useMemo(() => ({
    program: filters.program,
    range: filters.range,
    from: filters.from,
    to: filters.to,
    branchId: filters.branchId,
    compare: filters.compare
  }), [filters.program, filters.from, filters.to, filters.branchId, filters.compare]);
  const getOverview = useCallback(({ signal }) => metricsService.getOverview(overviewParams, { signal }), [overviewParams]);
  const { data, error, loading, reload } = useFetch(getOverview, [overviewParams]);
  const dateTitle = DATE_LABELS[filters.range] || DATE_LABELS.custom;
  const summary = data
    ? `${dateTitle}, tus clientes volvieron ${Math.round(data.kpis.visits.current).toLocaleString("es-PE")} veces y gastaron ${formatMoney(data.kpis.sales.current)}${data.kpis.sales.change === null ? "." : `, ${Math.abs(data.kpis.sales.change)}% ${data.kpis.sales.change >= 0 ? "más" : "menos"} que ${filters.compare === "lastYear" ? "el mismo periodo del año pasado" : "el periodo anterior"}.`}`
    : "Consulta el rendimiento de cada programa y descubre qué acción puede ayudar a tu negocio.";

  const exportCsv = async () => {
    try {
      const file = await metricsService.exportCsv({ ...overviewParams, program: filters.program });
      const url = URL.createObjectURL(new Blob([file.content], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = file.filename || "fidegresa-metricas.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (exportError) {
      showError(exportError.message);
    }
  };

  if (error && !data) return <><PageHeader title="Métricas" /><ErrorState error={error} onRetry={reload} /></>;
  if (branchesError && !branches.length) return <><PageHeader title="Métricas" /><ErrorState error={branchesError} onRetry={reloadBranches} /></>;

  return <>
    <PageHeader title={`Hola, ${data?.owner || "bienvenido"}`} summary={summary} />
    <MetricsFilters filters={filters} update={update} onExport={exportCsv} />
    <p className="metrics-comparison-label">Comparado con {comparisonLabel(filters)}.</p>
    {loading && data && <p className="metrics-loading-note" role="status">Actualizando indicadores…</p>}
    {data
      ? <MetricContent data={data} filters={filters} />
      : <>
        <Skeleton height={320} />
        <section className="metrics-summary-grid" aria-label="Cargando indicadores">
          {Array.from({ length: 4 }, (_, index) => <Skeleton height={104} key={index} />)}
        </section>
        <Skeleton height={320} />
      </>}

    <article className="panel metrics-activity-panel metrics-content-section">
      <PanelHeading title="Actividad reciente" subtitle="Movimientos de tus clientes en todos los programas" />
      <ActivityTable program={filters.program} branchId={filters.branchId} from={filters.from} to={filters.to} />
    </article>
  </>;
}
