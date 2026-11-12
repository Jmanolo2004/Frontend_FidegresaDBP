import { lazy, Suspense, useCallback, useMemo } from "react";
import { Link, useOutletContext } from "react-router-dom";
import PropTypes from "prop-types";
import { ActivityTable } from "../../components/metrics/ActivityTable";
import { MetricsFilters } from "../../components/metrics/MetricsFilters";
import { ErrorState } from "../../components/common/ErrorState";
import { PageHeader } from "../../components/common/PageHeader";
import { PanelHeading } from "../../components/common/PanelHeading";
import { Skeleton } from "../../components/common/Skeleton";
import { useFetch } from "../../hooks/useFetch";
import { useMetricsFilters } from "../../hooks/useMetricsFilters";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useToast } from "../../hooks/useToast";
import { metricsService } from "../../services/metricsService";
import { formatMoney } from "../../utils/format";

const ActivityChart = lazy(() => import("../../components/metrics/MetricsVisuals").then(module => ({ default: module.ActivityChart })));
const KpiWithSparkline = lazy(() => import("../../components/metrics/MetricsVisuals").then(module => ({ default: module.KpiWithSparkline })));
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
  return <span className={trend < 0 ? "trend-down" : "trend-up"} tabIndex={0} title={`Comparado con ${compareLabel}`}>{trend > 0 ? "+" : ""}{trend}% en ventas vs. {compareLabel}</span>;
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
  const monthName = date => new Intl.DateTimeFormat("es-PE", { month: "short" }).format(date).replace(/\./g, "").toLocaleLowerCase("es-PE");
  const yearSuffix = comparisonTo.getFullYear() !== to.getFullYear() ? ` ${comparisonTo.getFullYear()}` : "";
  if (comparisonFrom.toDateString() === comparisonTo.toDateString()) return `${format(comparisonTo)}${yearSuffix}`;
  return comparisonFrom.getMonth() === comparisonTo.getMonth() && comparisonFrom.getFullYear() === comparisonTo.getFullYear()
    ? `${comparisonFrom.getDate()}–${comparisonTo.getDate()} ${monthName(comparisonTo)}${yearSuffix}`
    : `${format(comparisonFrom)}–${format(comparisonTo)}${yearSuffix}`;
}

function MetricContent({ data, filters }) {
  const { kpis, series, breakdowns, programs } = data;
  const compareLabel = filters.compare === "lastYear" ? "el mismo periodo del año pasado" : "el periodo anterior";
  const dateTitle = DATE_LABELS[filters.range] || DATE_LABELS.custom;
  const ProgramComponent = PROGRAM_COMPONENTS[filters.program];
  const selectedBreakdown = breakdowns.programs.find(item => item.key === filters.program);
  const selectedProgram = programs[filters.program];
  const spark = key => series.items.map(item => Number(item[key] || 0));
  const kpiCards = [
    { label: "Ventas con tarjeta", value: formatMoney(kpis.sales.current), metric: kpis.sales, series: spark("ventas"), help: "Compras registradas con alguna tarjeta de fidelización." },
    { label: "Visitas", value: Math.round(kpis.visits.current).toLocaleString("es-PE"), metric: kpis.visits, series: spark("visitas"), help: "Veces que un cliente escaneó su tarjeta." },
    { label: "Clientes que volvieron", value: kpis.returningCustomers ? Math.round(kpis.returningCustomers.current).toLocaleString("es-PE") : "—", metric: kpis.returningCustomers, series: spark("clientesRecurrentes"), help: "Clientes con dos o más visitas en el periodo." },
    { label: "Ticket promedio", value: formatMoney(kpis.ticket.current), metric: kpis.ticket, series: spark("ticket"), help: "Gasto promedio por visita." }
  ];

  if (ProgramComponent) {
    return <Suspense fallback={<Skeleton height={430} />}>
      <ProgramComponent data={selectedProgram} cardId={selectedBreakdown?.card?.id} trend={selectedBreakdown?.trend ?? null} compareLabel={compareLabel} />
    </Suspense>;
  }

  return <>
    <section className="metrics-kpi-row metrics-content-section" aria-label="Indicadores principales">
      <Suspense fallback={<Skeleton height={130} />}>
        {kpiCards.map(card => (
          <KpiWithSparkline key={card.label} label={card.label} value={card.value} trend={card.metric?.change ?? null} explanation={card.metric?.explanation} series={card.series} helpText={card.help} changeUnit={filters.compare === "lastYear" ? "% vs. año pasado" : "% vs. periodo anterior"} />
        ))}
      </Suspense>
    </section>

    <section className="panel metrics-chart-panel metrics-content-section">
      <PanelHeading title="Actividad del periodo" subtitle={`${dateTitle}. Elige qué quieres ver.`} />
      <Suspense fallback={<Skeleton height={300} />}>
        {series.items.length ? <ActivityChart series={series} /> : <div className="metrics-empty-inline">No hay ventas ni visitas en este periodo. Prueba otro rango o local.</div>}
      </Suspense>
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
        <section className="metrics-kpi-row" aria-label="Cargando indicadores">
          {Array.from({ length: 4 }, (_, index) => <Skeleton height={130} key={index} />)}
        </section>
        <Skeleton height={320} />
      </>}

    <article className="panel metrics-activity-panel metrics-content-section">
      <PanelHeading title="Actividad reciente" subtitle="Movimientos de tus clientes en todos los programas" />
      <ActivityTable program={filters.program} branchId={filters.branchId} from={filters.from} to={filters.to} />
    </article>
  </>;
}
