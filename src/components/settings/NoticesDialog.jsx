import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { Modal } from "../common/Modal";

export function NoticesDialog({ open, notices, onClose }) {
  const navigate = useNavigate();
  const review = to => {
    onClose();
    navigate(to);
  };

  return (
    <Modal open={open} title="Avisos del programa" subtitle="Información calculada con la actividad de tu negocio." onClose={onClose} onSubmit={onClose} submitLabel="Listo" hideCancel>
      {notices.length ? (
        <ul className="notice-list">
          {notices.map(notice => (
            <li key={notice.text}>
              <span>{notice.text}</span>
              <button type="button" className="text-button" onClick={() => review(notice.to)}>
                Revisar
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="modal-message">No hay avisos nuevos. Tu programa está al día.</p>
      )}
    </Modal>
  );
}

NoticesDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  notices: PropTypes.arrayOf(PropTypes.shape({ text: PropTypes.string, to: PropTypes.string })).isRequired,
  onClose: PropTypes.func.isRequired
};
