import PropTypes from "prop-types";

export function FilterSelect({ value, onChange, options, label }) {
  return (
    <select className="filter-select" value={value} onChange={event => onChange(event.target.value)} aria-label={label}>
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

FilterSelect.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  label: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(PropTypes.shape({ value: PropTypes.string.isRequired, label: PropTypes.string.isRequired })).isRequired
};
