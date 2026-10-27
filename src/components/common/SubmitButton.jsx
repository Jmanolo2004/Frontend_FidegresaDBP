import PropTypes from "prop-types";
import { Spinner } from "./Spinner";

/** Botón que se deshabilita mientras la petición está en curso para evitar el doble envío. */
export function SubmitButton({ loading, children, loadingText = "Procesando…", className = "auth-primary", disabled = false, ...props }) {
  return (
    <button type="submit" className={className} disabled={loading || disabled} aria-busy={loading || undefined} {...props}>
      {loading ? (
        <>
          <Spinner />
          {loadingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}

SubmitButton.propTypes = {
  loading: PropTypes.bool,
  children: PropTypes.node.isRequired,
  loadingText: PropTypes.string,
  className: PropTypes.string,
  disabled: PropTypes.bool
};
