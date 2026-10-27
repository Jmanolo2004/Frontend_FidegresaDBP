import { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { formatMoney, formatNumber } from "../../utils/format";

const WIDTH = 650;
const HEIGHT = 185;
const LEFT = 58;
const TOP = 15;
const PLOT_WIDTH = 569;
const PLOT_HEIGHT = 137;

/** Gráfico de línea en SVG (sin librerías) con tooltip accesible por teclado. */
export function ActivityChart({ series, metric, period }) {
  const isSales = metric === "ventas";
  const formatValue = value => (isSales ? formatMoney(value) : formatNumber(value));
  const [activeIndex, setActiveIndex] = useState(null);

  const chart = useMemo(() => {
    const values = series.map(item => item.value);
    const maxValue = Math.max(1, ...values);
    const step = isSales
      ? period === "month"
        ? maxValue > 500 ? 250 : 50
        : maxValue > 20000 ? 10000 : maxValue > 5000 ? 2500 : 1000
      : Math.max(5, Math.ceil(maxValue / 4 / 5) * 5);
    const axisMaximum = Math.max(step * 4, Math.ceil(maxValue / (step * 4)) * step * 4);
    const xFor = index => LEFT + (series.length === 1 ? PLOT_WIDTH / 2 : (index * PLOT_WIDTH) / (series.length - 1));
    const yFor = value => TOP + PLOT_HEIGHT - (value / axisMaximum) * PLOT_HEIGHT;
    const points = values.map((value, index) => `${xFor(index)},${yFor(value)}`).join(" ");
    const area = values.length > 1 ? `M ${LEFT},${TOP + PLOT_HEIGHT} L ${points.replaceAll(" ", " L ")} L ${LEFT + PLOT_WIDTH},${TOP + PLOT_HEIGHT} Z` : "";
    const ticks = [0, 1, 2, 3, 4].map(index => ({
      y: TOP + (index * PLOT_HEIGHT) / 4,
      value: Math.round((axisMaximum * (1 - index / 4)) / step) * step
    }));
    return { xFor, yFor, points, area, ticks, labelStride: Math.max(1, Math.ceil(series.length / 6)) };
  }, [series, isSales, period]);

  const axisLabel = value => (isSales ? (value >= 1000 ? `S/ ${value / 1000} mil` : formatMoney(value)) : formatNumber(value));
  const tooltipIndex = activeIndex ?? series.length - 1;
  const tooltip = series.length ? `${series[tooltipIndex].label} · ${formatValue(series[tooltipIndex].value)}` : "Sin actividad en este periodo";
  const periodLabel = period === "month" ? "este mes" : period === "quarter" ? "los últimos tres meses" : "este año";

  return (
    <>
      <div className="chart-wrap">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`${isSales ? "Ventas en soles" : "Visitas"} durante ${periodLabel}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#ad8059" stopOpacity=".25" />
              <stop offset="1" stopColor="#ad8059" stopOpacity=".01" />
            </linearGradient>
          </defs>
          {chart.ticks.map(tick => (
            <g key={tick.y}>
              <line className="chart-grid" x1={LEFT} y1={tick.y} x2={LEFT + PLOT_WIDTH} y2={tick.y} />
              <text className="chart-label" x="0" y={tick.y + 3}>
                {axisLabel(tick.value)}
              </text>
            </g>
          ))}
          <path className="chart-area" d={chart.area} />
          <polyline className="chart-line" points={chart.points} />
          {series.map((item, index) => (
            <circle
              key={item.label}
              className="chart-dot"
              cx={chart.xFor(index)}
              cy={chart.yFor(item.value)}
              r="4"
              tabIndex={0}
              aria-label={`${item.label} · ${formatValue(item.value)}`}
              onPointerEnter={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
            >
              <title>{`${item.label} · ${formatValue(item.value)}`}</title>
            </circle>
          ))}
          {series.map((item, index) =>
            index % chart.labelStride === 0 || index === series.length - 1 ? (
              <text key={`label-${item.label}`} className="chart-label" textAnchor="middle" x={chart.xFor(index)} y={HEIGHT - 5}>
                {item.short}
              </text>
            ) : null
          )}
        </svg>
        <span className="chart-tooltip" aria-live="polite">
          {tooltip}
        </span>
      </div>
      <details className="chart-data">
        <summary>Ver datos del gráfico</summary>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>{isSales ? "Ventas" : "Visitas"}</th>
              </tr>
            </thead>
            <tbody>
              {series.map(item => (
                <tr key={item.label}>
                  <td>{item.label}</td>
                  <td>{formatValue(item.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}

ActivityChart.propTypes = {
  series: PropTypes.arrayOf(PropTypes.shape({ label: PropTypes.string, short: PropTypes.string, value: PropTypes.number })).isRequired,
  metric: PropTypes.oneOf(["ventas", "visitas"]).isRequired,
  period: PropTypes.oneOf(["month", "quarter", "year"]).isRequired
};
