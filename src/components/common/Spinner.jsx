import PropTypes from "prop-types";

export function Spinner({ label = "Cargando" }) {
  return <span className="inline-spinner" role="status" aria-label={label} />;
}

Spinner.propTypes = { label: PropTypes.string };
