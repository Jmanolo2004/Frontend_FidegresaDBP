import PropTypes from "prop-types";

export function Switch({ checked, onChange, label, disabled = false }) {
  return (
    <button
      type="button"
      className={`switch${checked ? " on" : ""}`}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    />
  );
}

Switch.propTypes = {
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  label: PropTypes.string.isRequired,
  disabled: PropTypes.bool
};
