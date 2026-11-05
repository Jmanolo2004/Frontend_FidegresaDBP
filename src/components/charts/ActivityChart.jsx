import { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { formatMoney, formatNumber } from "../../utils/format";

const WIDTH = 650;
const HEIGHT = 200;
const LEFT = 58;
const TOP = 15;
const PLOT_WIDTH = 569;
const PLOT_HEIGHT = 150;

/** Gráfico de barras en SVG con valores accesibles por teclado. */
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
    const slotWidth = PLOT_WIDTH / Math.max(1, series.length);
    const barWidth = Math.max(2, Math.min(26, slotWidth * 0.68));
    const bars = series.map((item, index) => {
      const height = (item.value / axisMaximum) * PLOT_HEIGHT;
      return {
        ...item,
        x: LEFT + slotWidth * index + (slotWidth - barWidth) / 2,
        y: TOP + PLOT_HEIGHT - height,
        width: barWidth,
        height
      };
    });
    const ticks = [0, 1, 2, 3, 4].map(index => ({
      y: TOP + (index * PLOT_HEIGHT) / 4,
      value: Math.round((axisMaximum * (1 - index / 4)) / step) * step
    }));
    return { bars, ticks, labelStride: Math.max(1, Math.ceil(series.length / 8)) };
  }, [series, isSales, period]);

  const axisLabel = value => (isSales ? (value >= 1000 ? `S/ ${value / 1000} mil` : formatMoney(value)) : formatNumber(value));
  const tooltipIndex = activeIndex !== null && activeIndex < series.length ? activeIndex : series.length - 1;
  const tooltip = series.length ? `${series[tooltipIndex].label} · ${formatValue(series[tooltipIndex].value)}` : "Sin actividad en este periodo";
  const periodLabel = period === "month" ? "este mes" : period === "quarter" ? "los últimos tres meses" : "este año";

  return (
    <>
      <div className="chart-wrap">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`${isSales ? "Ventas en soles" : "Visitas"} durante ${periodLabel}, gráfico de barras`} preserveAspectRatio="none">
          {chart.ticks.map(tick => (
            <g key={tick.y}>
              <line className="chart-grid" x1={LEFT} y1={tick.y} x2={LEFT + PLOT_WIDTH} y2={tick.y} />
              <text className="chart-label" x="0" y={tick.y + 3}>
                {axisLabel(tick.value)}
              </text>
            </g>
          ))}
          {chart.bars.map((bar, index) => (
            <rect
              key={bar.label}
              className={`chart-bar${index === activeIndex ? " active" : ""}`}
              x={bar.x}
              y={bar.y}
              width={bar.width}
              height={Math.max(bar.height, 1)}
              rx="3"
              tabIndex={0}
              aria-label={`${bar.label} · ${formatValue(bar.value)}`}
              onPointerEnter={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
            >
              <title>{`${bar.label} · ${formatValue(bar.value)}`}</title>
            </rect>
          ))}
          {chart.bars.map((bar, index) =>
            index % chart.labelStride === 0 || index === series.length - 1 ? (
              <text key={`label-${bar.label}`} className="chart-label" textAnchor="middle" x={bar.x + bar.width / 2} y={HEIGHT - 5}>
                {bar.short}
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
