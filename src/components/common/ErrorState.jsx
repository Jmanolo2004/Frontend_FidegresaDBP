import PropTypes from "prop-types";
import { Icon } from "./Icon";

export function ErrorState({ error, onRetry, compact = false }) {
  const message = error?.message || "No pudimos cargar esta información.";
  return (
    <div className={`error-state${compact ? " compact" : ""}`} role="alert">
      <span className="error-state-icon">
        <Icon name="alert" size={22} />
      </span>
      <div>
        <strong>{error?.isNetworkError ? "Sin conexión" : "Algo salió mal"}</strong>
        <p>{message}</p>
      </div>
      {onRetry && (
        <button type="button" className="secondary-button" onClick={() => onRetry()}>
          <Icon name="refresh" size={15} />
          Reintentar
        </button>
      )}
    </div>
  );
}

ErrorState.propTypes = {
  error: PropTypes.shape({ message: PropTypes.string, isNetworkError: PropTypes.bool }),
  onRetry: PropTypes.func,
  compact: PropTypes.bool
};
