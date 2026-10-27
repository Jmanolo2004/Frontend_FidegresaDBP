import PropTypes from "prop-types";

export function EmptyState({ message, actionLabel, onAction }) {
  return (
    <div className="empty-state">
      <p className="empty-state-text">{message}</p>
      {actionLabel && onAction && (
        <button type="button" className="secondary-button" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

EmptyState.propTypes = {
  message: PropTypes.string.isRequired,
  actionLabel: PropTypes.string,
  onAction: PropTypes.func
};
