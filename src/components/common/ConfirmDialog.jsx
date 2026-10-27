import { useState } from "react";
import PropTypes from "prop-types";
import { Modal } from "./Modal";

/** Confirmación para acciones destructivas (eliminar, restablecer, etc.). */
export function ConfirmDialog({ open, title, description, confirmLabel = "Confirmar", onConfirm, onClose }) {
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} title={title} subtitle={description} onClose={onClose} onSubmit={handleConfirm} submitLabel={confirmLabel} submitting={submitting} danger>
      <p className="modal-message">Esta acción no se puede deshacer.</p>
    </Modal>
  );
}

ConfirmDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.node,
  confirmLabel: PropTypes.string,
  onConfirm: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired
};
