import { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { Icon } from "./Icon";
import { SubmitButton } from "./SubmitButton";

export function Modal({
  open,
  title,
  subtitle,
  onClose,
  onSubmit,
  submitLabel = "Guardar",
  submitting = false,
  submitDisabled = false,
  danger = false,
  wide = false,
  hideCancel = false,
  children
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const handleCancel = event => {
    event.preventDefault();
    if (!submitting) onClose();
  };

  const handleSubmit = event => {
    event.preventDefault();
    if (!submitting) onSubmit?.(event);
  };

  return (
    <dialog className="modal" ref={dialogRef} onCancel={handleCancel} aria-labelledby="modal-title">
      {open && (
        <form className="modal-card" data-wide={wide ? "true" : "false"} onSubmit={handleSubmit} noValidate>
          <div className="modal-head">
            <div>
              <h2 id="modal-title">{title}</h2>
              {subtitle && <p>{subtitle}</p>}
            </div>
            <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar" disabled={submitting}>
              <Icon name="close" size={16} />
            </button>
          </div>
          {children}
          <div className="modal-actions">
            {!hideCancel && (
              <button type="button" className="secondary-button" onClick={onClose} disabled={submitting}>
                Cancelar
              </button>
            )}
            <SubmitButton
              loading={submitting}
              disabled={submitDisabled}
              className={danger ? "danger-button" : "primary-button"}
              loadingText="Guardando…"
            >
              {submitLabel}
            </SubmitButton>
          </div>
        </form>
      )}
    </dialog>
  );
}

Modal.propTypes = {
  open: PropTypes.bool.isRequired,
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.node,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func,
  submitLabel: PropTypes.string,
  submitting: PropTypes.bool,
  submitDisabled: PropTypes.bool,
  danger: PropTypes.bool,
  wide: PropTypes.bool,
  hideCancel: PropTypes.bool,
  children: PropTypes.node
};
