import { lazy, Suspense, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import { ActivityTable } from "../../components/metrics/ActivityTable";
import { MetricsFilters } from "../../components/metrics/MetricsFilters";
import { PlanGate } from "../../components/metrics/PlanGate";
import { ErrorState } from "../../components/common/ErrorState";
import { PageHeader } from "../../components/common/PageHeader";
import { PanelHeading } from "../../components/common/PanelHeading";
import { Skeleton } from "../../components/common/Skeleton";
import { useFetch } from "../../hooks/useFetch";
import { useMetricsFilters } from "../../hooks/useMetricsFilters";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useToast } from "../../hooks/useToast";
import { branchService } from "../../services/branchService";
import { metricsService } from "../../services/metricsService";
import { formatMoney } from "../../utils/format";
import { PLAN_PREVIEW } from "../../components/metrics/planPreviewData";

const KpiWithSparkline = lazy(() => import("../../components/metrics/MetricsVisuals").then(module => ({ default: module.KpiWithSparkline })));
const ComboChart = lazy(() => import("../../components/metrics/MetricsVisuals").then(module => ({ default: module.ComboChart })));
const TrafficHeatmap = lazy(() => import("../../components/metrics/MetricsVisuals").then(module => ({ default: module.TrafficHeatmap })));
const LoyaltyFunnel = lazy(() => import("../../components/metrics/MetricsVisuals").then(module => ({ default: module.LoyaltyFunnel })));
const CohortTable = lazy(() => import("../../components/metrics/MetricsVisuals").then(module => ({ default: module.CohortTable })));
const BranchRanking = lazy(() => import("../../components/metrics/MetricsVisuals").then(module => ({ default: module.BranchRanking })));
const InsightList = lazy(() => import("../../components/metrics/MetricsVisuals").then(module => ({ default: module.InsightList })));
const ProgramBreakdown = lazy(() => import("../../components/metrics/MetricsVisuals").then(module => ({ default: module.ProgramBreakdown })));
const StampsPanel = lazy(() => import("../../components/metrics/MetricsVisuals").then(module => ({ default: module.StampsPanel })));
const CashbackPanel = lazy(() => import("../../components/metrics/MetricsVisuals").then(module => ({ default: module.CashbackPanel })));
const TiersPanel = lazy(() => import("../../components/metrics/MetricsVisuals").then(module => ({ default: module.TiersPanel })));
const GiftcardPanel = lazy(() => import("../../components/metrics/MetricsVisuals").then(module => ({ default: module.GiftcardPanel })));

const PROGRAM_COMPONENTS = { stamps: StampsPanel, cashback: CashbackPanel, tiers: TiersPanel, giftcard: GiftcardPanel };
const PROGRAM_LABELS = { all: "General", stamps: "Estampillas", cashback: "Cashback", tiers: "Niveles", giftcard: "Gift card" };
const DATE_LABELS = { today: "Hoy", "7days": "Los últimos 7 días", "30days": "Los últimos 30 días", month: "Este mes", quarter: "Este trimestre", year: "Este año", custom: "El periodo seleccionado" };

function TrendText({ metric, compareLabel }) {
  const trend = metric?.change;
  if (trend === null || trend === undefined) return <span className="metrics-no-comparison" title={metric?.explanation || "No hay datos comparables para este periodo."}>Nuevo · sin datos del periodo anterior</span>;
  return <span className={trend < 0 ? "trend-down" : "trend-up"} title={`Comparado con ${compareLabel}`}>{trend > 0 ? "+" : ""}{trend}% vs. {compareLabel}</span>;
}
TrendText.propTypes = { metric: PropTypes.object, compareLabel: PropTypes.string.isRequired };

function MetricContent({ data, filters }) {
  const { kpis, series, breakdowns, programs } = data;
  const compareLabel = filters.compare === "lastYear" ? "el mismo periodo del año pasado" : "el periodo anterior";
  const dateTitle = DATE_LABELS[filters.range] || DATE_LABELS.custom;
  const ProgramComponent = PROGRAM_COMPONENTS[filters.program];
  const selectedBreakdown = breakdowns.programs.find(item => item.key === filters.program);
  const selectedProgram = programs[filters.program];
  const advancedLocked = !["Crece", "Avanza"].includes(data.plan);
  const currentValue = metric => {
    if (metric === "sales" || metric === "ticket") return formatMoney(kpis[metric].current);
    if (metric === "returningRate") return `${kpis[metric].current.toFixed(1)}%`;
    return Math.round(kpis[metric].current).toLocaleString("es-PE");
  };
  const seriesFor = metric => series.items.map(item => ({
    sales: item.ventas,
    visits: item.visitas,
    created: item.clientesNuevos,
    active: item.clientesActivos,
    returningRate: item.tasaRetorno,
    ticket: item.ticket
  })[metric] || 0);

  if (ProgramComponent) {
    return <Suspense fallback={<Skeleton height={430} />}>
      <ProgramComponent data={selectedProgram} cardId={selectedBreakdown?.card?.id} trend={selectedBreakdown?.trend ?? null} compareLabel={compareLabel} />
    </Suspense>;
  }

  return <>
    <section className="metrics-kpi-grid" aria-label="Indicadores del negocio">
      {[
        ["Ventas con tarjeta", currentValue("sales"), "sales", "#603f2a"],
        ["Visitas", currentValue("visits"), "visits", "#c8894f"],
        ["Clientes activos · 60 días", currentValue("active"), "active", "#4e8066"],
        ["Clientes nuevos", currentValue("created"), "created", "#8a5a7a"],
        ["Tasa de retorno", currentValue("returningRate"), "returningRate", "#4e8066"],
        ["Ticket promedio", currentValue("ticket"), "ticket", "#c8894f"]
      ].map(([label, value, key, color]) => <Suspense fallback={<Skeleton key={key} height={118} />} key={key}>
        <KpiWithSparkline label={label} value={value} trend={kpis[key].change} explanation={kpis[key].explanation} series={seriesFor(key)} color={color} />
      </Suspense>)}
    </section>

    <section className="panel metrics-chart-panel">
      <PanelHeading title="Visitas, clientes nuevos y ventas" subtitle={`${dateTitle} · compara actividad y valor en una sola vista`}>
        <TrendText metric={kpis.sales} compareLabel={compareLabel} />
      </PanelHeading>
      <Suspense fallback={<Skeleton height={300} />}>
        {series.items.length ? <ComboChart series={series} /> : <div className="metrics-empty-inline">No hay ventas ni visitas en este periodo. Prueba otro rango o local.</div>}
      </Suspense>
    </section>

    <Suspense fallback={<Skeleton height={320} />}>
      <ProgramBreakdown programs={breakdowns.programs} totalSales={breakdowns.totalSales} />
    </Suspense>

    <div className="metrics-two-column">
      <PlanGate locked={!["Crece", "Avanza"].includes(data.plan)} title="Mapa de calor de afluencia">
        <article className="panel">
          <PanelHeading title="Mapa de calor de afluencia" subtitle="Día de la semana y hora para organizar al equipo" />
          <Suspense fallback={<Skeleton height={240} />}><TrafficHeatmap data={advancedLocked ? PLAN_PREVIEW.traffic : data.traffic} /></Suspense>
        </article>
      </PlanGate>
      <PlanGate locked={!["Crece", "Avanza"].includes(data.plan)} title="Embudo de fidelización">
        <article className="panel">
          <PanelHeading title="Embudo de fidelización" subtitle="Del registro al canje de una recompensa" />
          <Suspense fallback={<Skeleton height={240} />}><LoyaltyFunnel items={advancedLocked ? PLAN_PREVIEW.funnel : data.funnel} /></Suspense>
        </article>
      </PlanGate>
    </div>

    <div className="metrics-two-column metrics-bottom-grid">
      <PlanGate locked={!["Crece", "Avanza"].includes(data.plan)} title="Retención por cohortes">
        <article className="panel">
          <PanelHeading title="Retención por cohortes" subtitle="Porcentaje de clientes activos según su mes de alta" />
          <Suspense fallback={<Skeleton height={260} />}><CohortTable rows={advancedLocked ? PLAN_PREVIEW.cohorts : data.cohorts} /></Suspense>
        </article>
      </PlanGate>
      <article className="panel">
        <PanelHeading title="Rendimiento por local" subtitle="Ventas, visitas, retorno y reseña promedio">
          <Link className="text-button" to="/panel/ubicaciones">Ver locales</Link>
        </PanelHeading>
        <Suspense fallback={<Skeleton height={260} />}><BranchRanking branches={breakdowns.branches} /></Suspense>
      </article>
    </div>

    <article className="panel metrics-insights-panel">
      <PanelHeading title="Qué hacer esta semana" subtitle="Sugerencias priorizadas a partir de tus datos" />
      <Suspense fallback={<Skeleton height={160} />}><InsightList insights={data.insights} /></Suspense>
    </article>
  </>;
}

MetricContent.propTypes = { data: PropTypes.object.isRequired, filters: PropTypes.object.isRequired };

export default function MetricsPage() {
  useDocumentTitle("Métricas");
  const { filters, update } = useMetricsFilters();
  const { showError } = useToast();
  const overviewParams = useMemo(() => ({
    program: filters.program,
    from: filters.from,
    to: filters.to,
    branchId: filters.branchId,
    compare: filters.compare
  }), [filters.program, filters.from, filters.to, filters.branchId, filters.compare]);
  const getOverview = useCallback(({ signal }) => metricsService.getOverview(overviewParams, { signal }), [overviewParams]);
  const { data, error, loading, reload } = useFetch(getOverview, [overviewParams]);
  const getBranches = useCallback(({ signal }) => branchService.getAll({ signal }), []);
  const { data: branchData, error: branchesError, reload: reloadBranches } = useFetch(getBranches, []);
  const branches = branchData || [];
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
  if (branchesError && !branchData) return <><PageHeader title="Métricas" /><ErrorState error={branchesError} onRetry={reloadBranches} /></>;

  return <>
    <PageHeader title={`Hola, ${data?.owner || "bienvenido"}`} summary={summary} />
    <MetricsFilters filters={filters} update={update} branches={branches} onExport={exportCsv} plan={data?.plan || "Emprende"} />
    {loading && data && <p className="metrics-loading-note" role="status">Actualizando indicadores…</p>}
    {data
      ? <MetricContent data={data} filters={filters} />
      : <section className="metrics-kpi-grid">{Array.from({ length: 6 }, (_, index) => <Skeleton height={118} key={index} />)}</section>}

    {filters.program === "all" && <PlanGate locked={!["Crece", "Avanza"].includes(data?.plan || "Emprende")} title="Exportación PDF">
      <div className="metrics-print-gate"><span>Informe para compartir</span><button type="button" className="secondary-button" onClick={() => window.print()}>Imprimir / Guardar como PDF</button></div>
    </PlanGate>}

    <article className="panel metrics-activity-panel">
      <PanelHeading title="Actividad reciente" subtitle="Movimientos de tus clientes en todos los programas" />
      <ActivityTable program={filters.program} branchId={filters.branchId} from={filters.from} to={filters.to} />
    </article>
  </>;
}
