import { useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { EmptyState } from "../common/EmptyState";
import { PanelHeading } from "../common/PanelHeading";
import { formatMoney } from "../../utils/format";

export function KpiWithSparkline({ label, value, trend, explanation, series = [], color = "#603f2a" }) {
  const points = series.length ? series : [1, 2, 1, 3, 2, 4, 3];
  const max = Math.max(1, ...points);
  const polyline = points.map((point, index) => `${index * 100 / Math.max(1, points.length - 1)},${24 - point / max * 20}`).join(" ");
  const numericValue = Number(String(value).replace(/[^\d.-]/g, "")) || 0;
  return (
    <article className="metrics-kpi">
      <span>{label}</span>
      <strong>{value}</strong>
      <div className="metrics-kpi-bottom">
        <span className={trend === null ? "trend-new" : trend < 0 ? "trend-down" : "trend-up"} title={explanation || undefined}>
          {trend === null ? (numericValue > 0 ? "Nuevo" : "—") : `${trend > 0 ? "+" : ""}${trend}%`}
        </span>
        <svg viewBox="0 0 100 28" aria-hidden="true"><polyline points={polyline} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
      {trend === null && <small className="metrics-kpi-explanation">{explanation || "Sin datos en el periodo de comparación."}</small>}
    </article>
  );
}

KpiWithSparkline.propTypes = {
  label: PropTypes.string.isRequired, value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  trend: PropTypes.number, explanation: PropTypes.string, series: PropTypes.arrayOf(PropTypes.number), color: PropTypes.string
};

function DataTable({ rows, headers }) {
  return <details className="chart-data"><summary>Ver datos en tabla</summary><div className="table-wrap"><table className="data-table">
    <thead><tr>{headers.map(header => <th key={header}>{header}</th>)}</tr></thead>
    <tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody>
  </table></div></details>;
}
DataTable.propTypes = { rows: PropTypes.arrayOf(PropTypes.array).isRequired, headers: PropTypes.arrayOf(PropTypes.string).isRequired };

export function ComboChart({ series }) {
  const [hidden, setHidden] = useState([]);
  const [active, setActive] = useState(null);
  const visible = key => !hidden.includes(key);
  const toggle = key => setHidden(previous => previous.includes(key) ? previous.filter(item => item !== key) : [...previous, key]);
  const maxVisits = Math.max(1, ...series.items.map(item => Math.max(item.visitas, item.clientesNuevos)));
  const maxSales = Math.max(1, ...series.items.map(item => item.ventas));
  const width = 720, height = 250, left = 44, right = 42, top = 18, bottom = 32;
  const plotWidth = width - left - right, plotHeight = height - top - bottom;
  const step = plotWidth / Math.max(1, series.items.length);
  const salesPoints = series.items.map((item, index) => `${left + step * (index + .5)},${top + plotHeight - item.ventas / maxSales * plotHeight}`).join(" ");
  const bars = series.items.flatMap((item, index) => {
    const barWidth = Math.max(3, step * .27);
    const x = left + index * step + step * .2;
    return [
      { key: "visitas", x, value: item.visitas, fill: "#603f2a", dx: 0 },
      { key: "clientesNuevos", x: x + barWidth + 2, value: item.clientesNuevos, fill: "#c8894f", dx: 0 }
    ].filter(bar => visible(bar.key)).map(bar => ({ ...bar, y: top + plotHeight - bar.value / maxVisits * plotHeight, width: barWidth, height: bar.value / maxVisits * plotHeight, label: item.label, index }));
  });
  const legend = [["visitas", "Visitas", "#603f2a"], ["clientesNuevos", "Clientes nuevos", "#c8894f"], ["ventas", "Ventas (S/)", "#4e8066"]];
  const current = active === null ? null : series.items[active];
  const tableRows = series.items.map(item => [item.label, item.visitas, item.clientesNuevos, formatMoney(item.ventas)]);
  return <>
    <div className="metrics-chart-legend">{legend.map(([key, label, color]) => <button key={key} type="button" className={hidden.includes(key) ? "muted" : ""} onClick={() => toggle(key)}><i style={{ background: color }} />{label}</button>)}</div>
    <div className="metrics-combo-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Visitas y clientes nuevos como barras, ventas como línea">
        {[0, 1, 2, 3, 4].map(tick => <g key={tick}><line x1={left} x2={width - right} y1={top + plotHeight * tick / 4} y2={top + plotHeight * tick / 4} className="metrics-grid-line" /><text x="0" y={top + plotHeight * tick / 4 + 4}>{Math.round(maxVisits * (4 - tick) / 4)}</text></g>)}
        {bars.map(bar => <rect key={`${bar.key}-${bar.index}`} x={bar.x} y={bar.y} width={bar.width} height={Math.max(1, bar.height)} rx="2" fill={bar.fill} tabIndex={0} aria-label={`${bar.label}, ${bar.key === "visitas" ? "visitas" : "clientes nuevos"}: ${bar.value}`} onPointerEnter={() => setActive(bar.index)} onFocus={() => setActive(bar.index)} />)}
        {visible("ventas") && <polyline points={salesPoints} fill="none" stroke="#4e8066" strokeWidth="3" strokeLinejoin="round" />}
        {visible("ventas") && series.items.map((item, index) => <circle key={item.label} cx={left + step * (index + .5)} cy={top + plotHeight - item.ventas / maxSales * plotHeight} r="3" fill="#4e8066" tabIndex={0} aria-label={`${item.label}, ventas ${formatMoney(item.ventas)}`} onPointerEnter={() => setActive(index)} onFocus={() => setActive(index)} />)}
        {series.items.map((item, index) => index % Math.max(1, Math.ceil(series.items.length / 9)) === 0 || index === series.items.length - 1 ? <text key={item.label} x={left + step * (index + .5)} y={height - 7} textAnchor="middle">{item.label}</text> : null)}
        <text x={width - right + 3} y={top + 8} className="metrics-right-axis">S/</text>
      </svg>
      {current && <p className="metrics-chart-tooltip" aria-live="polite">{current.label}: {current.visitas} visitas · {current.clientesNuevos} clientes nuevos · {formatMoney(current.ventas)}</p>}
    </div>
    <DataTable headers={["Periodo", "Visitas", "Clientes nuevos", "Ventas"]} rows={tableRows} />
  </>;
}
ComboChart.propTypes = { series: PropTypes.shape({ items: PropTypes.arrayOf(PropTypes.object).isRequired, interval: PropTypes.string }).isRequired };

export function TrafficHeatmap({ data }) {
  const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const max = Math.max(1, ...data.flat().map(item => item.count));
  return <div className="metrics-heatmap-scroll"><table className="metrics-heatmap" aria-label="Afluencia por día y hora">
    <thead><tr><th>Día</th>{Array.from({ length: 15 }, (_, index) => <th key={index}>{index + 8}:00</th>)}</tr></thead>
    <tbody>{days.map((day, row) => <tr key={day}><th>{day}</th>{data[row]?.map(cell => <td key={cell.hour} title={`${day} ${cell.hour}:00 · ${cell.count} visitas`} style={{ "--heat": .12 + cell.count / max * .78 }}>{cell.count || ""}</td>)}</tr>)}</tbody>
  </table></div>;
}
TrafficHeatmap.propTypes = { data: PropTypes.arrayOf(PropTypes.array).isRequired };

export function LoyaltyFunnel({ items }) {
  const max = Math.max(1, ...items.map(item => item.value));
  return <ol className="metrics-funnel">{items.map((item, index) => <li key={item.label}>
    <div className="metrics-funnel-label"><span>{item.label}</span><strong>{item.value}</strong>{index > 0 && <small>{items[index - 1].value ? Math.round(item.value / items[index - 1].value * 100) : 0}% conversión</small>}</div>
    <i style={{ width: `${Math.max(8, item.value / max * 100)}%` }} />
  </li>)}</ol>;
}
LoyaltyFunnel.propTypes = { items: PropTypes.arrayOf(PropTypes.shape({ label: PropTypes.string, value: PropTypes.number })).isRequired };

export function CohortTable({ rows }) {
  return <div className="table-wrap"><table className="metrics-cohort-table"><thead><tr><th>Mes de alta</th>{["M0", "M1", "M2", "M3", "M4", "M5"].map(month => <th key={month}>{month}</th>)}</tr></thead>
    <tbody>{rows.map(row => <tr key={row.month}><th>{row.month}</th>{Array.from({ length: 6 }, (_, index) => {
      const value = row.values[index];
      return <td key={index} style={{ "--cohort": value === undefined ? 0 : .12 + value / 100 * .78 }}>{value === undefined ? "—" : `${value}%`}</td>;
    })}</tr>)}</tbody>
  </table></div>;
}
CohortTable.propTypes = { rows: PropTypes.arrayOf(PropTypes.shape({ month: PropTypes.string, values: PropTypes.arrayOf(PropTypes.number) })).isRequired };

export function BranchRanking({ branches }) {
  const max = Math.max(1, ...branches.map(branch => branch.sales));
  return <ol className="metrics-branch-ranking">{branches.map((branch, index) => <li key={branch.id}>
    <span className="metrics-rank">{index + 1}</span><div className="metrics-branch-info"><Link to={`/panel/ubicaciones?local=${branch.id}`}>{branch.name}</Link>
      <div className="metrics-ranking-bar"><i style={{ width: `${branch.sales / max * 100}%` }} /></div>
      <small>{branch.visits} visitas · {branch.returnRate}% retorno · ★ {branch.rating.toFixed(1)}</small></div><strong>{formatMoney(branch.sales)}</strong>
  </li>)}</ol>;
}
BranchRanking.propTypes = { branches: PropTypes.arrayOf(PropTypes.object).isRequired };

export function InsightList({ insights }) {
  if (!insights.length) return <EmptyState message="Todo está al día. Sigue cuidando la experiencia de tus clientes." />;
  return <ul className="metrics-insights">{insights.map(item => <li key={item.id}>
    <span className="metrics-insight-priority">{item.priority}</span><div><strong>{item.text}</strong><small>{item.impact}</small></div><Link className="secondary-button" to={item.to}>{item.action}</Link>
  </li>)}</ul>;
}
InsightList.propTypes = { insights: PropTypes.arrayOf(PropTypes.object).isRequired };

function ProgramStat({ label, value }) {
  return <div className="metrics-program-stat"><span>{label}</span><strong>{value}</strong></div>;
}
ProgramStat.propTypes = { label: PropTypes.string.isRequired, value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired };

function StampHistogram({ rows }) {
  const max = Math.max(1, ...rows.map(item => item.value));
  return <div className="metrics-histogram" role="img" aria-label="Clientes por cantidad de sellos">
    {rows.map(item => <div key={item.label}><i style={{ height: `${Math.max(3, item.value / max * 100)}%` }} /><small>{item.label}</small><b>{item.value}</b></div>)}
  </div>;
}
StampHistogram.propTypes = { rows: PropTypes.arrayOf(PropTypes.object).isRequired };

function ProgramPanel({ title, subtitle, stats, cardId, children, trend, compareLabel }) {
  return <article className="panel metrics-program-panel">
    <PanelHeading title={title} subtitle={subtitle}>{cardId && <Link className="text-button" to={`/panel/tarjetas/${cardId}`}>Ver tarjeta</Link>}</PanelHeading>
    <p className="metrics-program-comparison" title={trend === null ? "Sin datos en el periodo de comparación." : `Comparado con ${compareLabel}`}>
      Ventas del programa: {trend === null ? "Nuevo · sin datos comparables" : `${trend > 0 ? "+" : ""}${trend}% vs. ${compareLabel}`}
    </p>
    <div className="metrics-program-stats">{stats.map(item => <ProgramStat key={item.label} {...item} />)}</div>
    {children}
  </article>;
}
ProgramPanel.propTypes = { title: PropTypes.string.isRequired, subtitle: PropTypes.string.isRequired, stats: PropTypes.arrayOf(PropTypes.object).isRequired, cardId: PropTypes.number, children: PropTypes.node, trend: PropTypes.number, compareLabel: PropTypes.string.isRequired };

export function StampsPanel({ data, cardId, trend, compareLabel }) {
  return <ProgramPanel title="Estampillas" subtitle="El avance de tus clientes hacia la próxima recompensa" cardId={cardId} trend={trend} compareLabel={compareLabel} stats={[
    { label: "Sellos otorgados", value: data.kpis.issued }, { label: "Tarjetas completadas", value: data.kpis.completed },
    { label: "Canjes", value: data.kpis.redemptions }, { label: "Tasa de completación", value: `${data.kpis.completionRate}%` },
    { label: "Días para completar", value: data.kpis.daysToComplete }, { label: "Sellos por visita", value: data.kpis.stampsPerVisit }
  ]}>
    <div className="metrics-program-detail-grid"><div><h3>Progreso de estampillas</h3><StampHistogram rows={data.histogram} /></div>
      <div><h3>A punto de canjear</h3>{data.closeToReward.length ? <ul className="metrics-mini-list">{data.closeToReward.map(customer => <li key={customer.id}><span>{customer.name}</span><strong>{customer.progress} sellos</strong></li>)}</ul> : <EmptyState message="Aún no hay clientes cerca de su premio." />}</div>
    </div>
  </ProgramPanel>;
}
StampsPanel.propTypes = { data: PropTypes.object.isRequired, cardId: PropTypes.number, trend: PropTypes.number, compareLabel: PropTypes.string.isRequired };

export function CashbackPanel({ data, cardId, trend, compareLabel }) {
  return <ProgramPanel title="Cashback" subtitle="Saldo generado, usado y disponible para tus clientes" cardId={cardId} trend={trend} compareLabel={compareLabel} stats={[
    { label: "Cashback emitido", value: formatMoney(data.kpis.issued) }, { label: "Canjeado", value: formatMoney(data.kpis.redeemed) },
    { label: "Saldo pendiente", value: formatMoney(data.kpis.pending) }, { label: "Tasa de redención", value: `${data.kpis.redemptionRate}%` },
    { label: "Ventas incrementales", value: formatMoney(data.kpis.incrementalSales) }, { label: "Costo / ventas", value: `${data.kpis.costRate}%` }
  ]}>
    <div className="metrics-program-detail-grid"><div><h3>Emitido y canjeado en el tiempo</h3><CashbackTrendChart series={data.series} /></div>
      <div><h3>Distribución de saldos</h3><div className="metrics-horizontal-bars">{data.balances.map(item => <div key={item.label}><span>S/ {item.label}</span><i><b style={{ width: `${Math.min(100, item.value * 18)}%` }} /></i><strong>{item.value}</strong></div>)}</div></div>
    </div>
  </ProgramPanel>;
}
CashbackPanel.propTypes = { data: PropTypes.object.isRequired, cardId: PropTypes.number, trend: PropTypes.number, compareLabel: PropTypes.string.isRequired };

function CashbackTrendChart({ series }) {
  const maximum = Math.max(1, ...series.map(item => item.issued));
  const width = 560, height = 150, left = 8, top = 10, bottom = 25;
  const plotHeight = height - top - bottom;
  const slot = (width - left * 2) / Math.max(1, series.length - 1);
  const y = value => top + plotHeight - value / maximum * plotHeight;
  const issued = series.map((item, index) => `${left + index * slot},${y(item.issued)}`).join(" ");
  const redeemed = series.map((item, index) => `${left + index * slot},${y(item.redeemed)}`).join(" ");
  return <>
    <div className="metrics-chart-legend"><span><i style={{ background: "#c8894f" }} />Emitido</span><span><i style={{ background: "#4e8066" }} />Canjeado</span></div>
    <svg className="metrics-cashback-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Cashback emitido y canjeado a través del tiempo">
      {series.length > 1 && <>
        <polygon points={`${left},${height - bottom} ${issued} ${width - left},${height - bottom}`} fill="#c8894f" opacity=".16" />
        <polygon points={`${left},${height - bottom} ${redeemed} ${width - left},${height - bottom}`} fill="#4e8066" opacity=".14" />
        <polyline points={issued} fill="none" stroke="#c8894f" strokeWidth="3" />
        <polyline points={redeemed} fill="none" stroke="#4e8066" strokeWidth="3" />
      </>}
    </svg>
    <DataTable headers={["Periodo", "Emitido", "Canjeado"]} rows={series.map(item => [item.label, formatMoney(item.issued), formatMoney(item.redeemed)])} />
  </>;
}
CashbackTrendChart.propTypes = { series: PropTypes.arrayOf(PropTypes.object).isRequired };

export function TiersPanel({ data, cardId, trend, compareLabel }) {
  const max = Math.max(1, ...data.levels.map(item => item.count));
  return <ProgramPanel title="Niveles" subtitle="Crecimiento y movimiento de tus clientes entre niveles" cardId={cardId} trend={trend} compareLabel={compareLabel} stats={[
    { label: "Clientes por nivel", value: data.kpis.levels.reduce((sum, item) => sum + item.count, 0) },
    { label: "Ascensos", value: data.kpis.promotions }, { label: "Descensos", value: data.kpis.demotions },
    { label: "Días para subir", value: data.kpis.daysToUpgrade }, { label: "Gasto promedio", value: formatMoney(data.kpis.averageSpend) }
  ]}>
    <div className="metrics-program-detail-grid"><div><h3>Clientes por nivel</h3><div className="metrics-level-bars">{data.levels.map(item => <div key={item.name}><span>{item.name}</span><i><b style={{ width: `${item.count / max * 100}%` }} /></i><strong>{item.count}</strong></div>)}</div></div>
      <div><h3>Movimientos en el periodo</h3><div className="metrics-tier-flow"><span>Bronce → Plata <b>{Math.round(data.kpis.promotions * .52)}</b></span><span>Plata → Oro <b>{Math.round(data.kpis.promotions * .34)}</b></span><span>Oro → Diamante <b>{Math.round(data.kpis.promotions * .14)}</b></span></div></div>
    </div>
  </ProgramPanel>;
}
TiersPanel.propTypes = { data: PropTypes.object.isRequired, cardId: PropTypes.number, trend: PropTypes.number, compareLabel: PropTypes.string.isRequired };

export function GiftcardPanel({ data, cardId, trend, compareLabel }) {
  return <ProgramPanel title="Gift card" subtitle="Ventas, canjes y saldo vigente de las tarjetas de regalo" cardId={cardId} trend={trend} compareLabel={compareLabel} stats={[
    { label: "Gift cards vendidas", value: data.kpis.sold }, { label: "Monto vendido", value: formatMoney(data.kpis.amount) },
    { label: "Monto canjeado", value: formatMoney(data.kpis.redeemed) }, { label: "Saldo vigente", value: formatMoney(data.kpis.balance) },
    { label: "Saldo vencido", value: formatMoney(data.kpis.breakage) }, { label: "Clientes nuevos", value: data.kpis.newCustomers }
  ]}>
    <div className="metrics-program-detail-grid"><div><h3>Ventas por denominación</h3><div className="metrics-horizontal-bars">{data.giftDenominations.map(item => <div key={item.label}><span>{item.label}</span><i><b style={{ width: `${Math.min(100, item.value * 2.2)}%` }} /></i><strong>{item.value}</strong></div>)}</div><h3>Estacionalidad</h3><SeasonalityChart series={data.seasonality} /></div>
      <div><h3>Por vencer en 30 días</h3><ul className="metrics-mini-list">{data.expiring.filter(item => item.days <= 30).map(item => <li key={item.id}><span>{item.name} · {formatMoney(item.amount)}</span><strong>{item.days} días</strong></li>)}</ul></div>
    </div>
  </ProgramPanel>;
}
GiftcardPanel.propTypes = { data: PropTypes.object.isRequired, cardId: PropTypes.number, trend: PropTypes.number, compareLabel: PropTypes.string.isRequired };

function SeasonalityChart({ series }) {
  const max = Math.max(1, ...series.map(item => item.sold));
  return <>
    <div className="metrics-seasonality" role="img" aria-label="Gift cards vendidas durante el periodo seleccionado">
      {series.map(item => <div key={item.label} title={`${item.label}: ${item.sold} gift cards`}><i style={{ height: `${Math.max(3, item.sold / max * 100)}%` }} /><small>{item.label}</small></div>)}
    </div>
    <DataTable headers={["Periodo", "Gift cards vendidas"]} rows={series.map(item => [item.label, item.sold])} />
  </>;
}
SeasonalityChart.propTypes = { series: PropTypes.arrayOf(PropTypes.object).isRequired };

export function ProgramBreakdown({ programs, totalSales }) {
  const denominator = Math.max(1, totalSales);
  return <section className="panel metrics-breakdown"><PanelHeading title="Rendimiento por programa" subtitle="Compara la contribución de cada tipo de tarjeta" />
    <div className="metrics-breakdown-cards">{programs.map(program => <article key={program.key} style={{ "--program-accent": program.color }}>
      <span>{program.label}</span><strong>{program.customers} clientes</strong><small>{program.visits} visitas · {formatMoney(program.sales)} · {program.redemptions} canjes</small>      <span className="metrics-trend" title={program.trend === null ? "No hubo datos de comparación para este programa." : "Variación de ventas"}>{program.trend === null ? (program.sales > 0 ? "Nuevo" : "—") : `${program.trend > 0 ? "+" : ""}${program.trend}%`}</span>
      <Link to={program.card?.id ? `/panel/tarjetas/${program.card.id}` : "/panel/tarjetas"}>Ver programa</Link>
    </article>)}</div>
    <h3>Participación en ventas</h3><div className="metrics-stacked-bar" role="img" aria-label="Participación de ventas por programa">{programs.map(program => <span key={program.key} title={`${program.label}: ${Math.round(program.sales / denominator * 100)}%`} style={{ width: `${program.sales / denominator * 100}%`, background: program.color }} />)}</div>
    <div className="metrics-chart-legend">{programs.map(program => <span key={program.key}><i style={{ background: program.color }} />{program.label}</span>)}</div>
  </section>;
}
ProgramBreakdown.propTypes = { programs: PropTypes.arrayOf(PropTypes.object).isRequired, totalSales: PropTypes.number.isRequired };
