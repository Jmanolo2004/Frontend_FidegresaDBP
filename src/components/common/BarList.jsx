import PropTypes from "prop-types";

export function BarList({ items, emptyMessage = "Sin datos para mostrar." }) {
  if (!items.length) return <div className="empty-state">{emptyMessage}</div>;
  const max = Math.max(1, ...items.map(item => item.value));
  return (
    <div className="bar-list">
      {items.map(item => (
        <div className="bar-row" key={item.label}>
          <span>{item.label}</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${Math.max(3, (item.share ?? (item.value / max) * 100))}%` }} />
          </div>
          <span className="bar-count">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

BarList.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({ label: PropTypes.string.isRequired, value: PropTypes.number.isRequired, share: PropTypes.number })
  ).isRequired,
  emptyMessage: PropTypes.string
};
