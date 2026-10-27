import PropTypes from "prop-types";
import { Icon } from "./Icon";

export function KpiCard({ label, value, change = null, comparisonLabel = "vs. mes anterior", explanation, icon = "chart" }) {
  const hasChange = change !== null && Number.isFinite(Number(change));
  return (
    <article className="kpi-card">
      <div className="kpi-top">
        <span>{label}</span>
        <span className="kpi-icon">
          <Icon name={icon} />
        </span>
      </div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-foot">
        {hasChange && (
          <>
            <span className={`trend${Number(change) < 0 ? " negative" : ""}`}>
              {Number(change) > 0 ? "+" : ""}
              {Number(change)}%
            </span>
            <span>{comparisonLabel}</span>
          </>
        )}
      </div>
      {explanation && <p className="kpi-explanation">{explanation}</p>}
    </article>
  );
}

KpiCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  change: PropTypes.number,
  comparisonLabel: PropTypes.string,
  explanation: PropTypes.string,
  icon: PropTypes.string
};
