import PropTypes from "prop-types";
import { Modal } from "../common/Modal";
import { FormField } from "../common/FormField";
import { useForm } from "../../hooks/useForm";
import { useToast } from "../../hooks/useToast";
import { reviewService } from "../../services/reviewService";
import { maxLength, required } from "../../utils/validators";

const rules = { reply: [required("Escribe una respuesta antes de guardar."), maxLength(500, "Usa hasta 500 caracteres.")] };

function ReplyForm({ review, onClose, onSaved }) {
  const { showToast, showError } = useToast();
  const editing = Boolean(review.respuesta);
  const form = useForm({
    initialValues: { reply: review.respuesta || "" },
    rules,
    onSubmit: async values => {
      try {
        const updated = await reviewService.reply(review.id, values.reply.trim());
        showToast(editing ? "Respuesta actualizada." : "Respuesta publicada.");
        onSaved(updated);
      } catch (error) {
        showError(error.message);
      }
    }
  });

  return (
    <Modal
      open
      title={editing ? "Editar respuesta" : "Responder reseña"}
      subtitle={`${review.nombre} · ${review.negocio} · ${review.calificacion} de 5 estrellas`}
      onClose={onClose}
      onSubmit={form.handleSubmit}
      submitLabel={editing ? "Guardar respuesta" : "Publicar respuesta"}
      submitting={form.isSubmitting}
      wide
    >
      <blockquote className="reply-quote">“{review.comentario}”</blockquote>
      <FormField label="Tu respuesta" error={form.errors.reply} hint={`${form.values.reply.length}/500 caracteres. Tu cliente la verá junto a su reseña.`}>
        <textarea className="form-control" rows={5} maxLength={500} autoFocus {...form.getFieldProps("reply")} />
      </FormField>
    </Modal>
  );
}

ReplyForm.propTypes = {
  review: PropTypes.shape({
    id: PropTypes.number.isRequired,
    nombre: PropTypes.string,
    negocio: PropTypes.string,
    calificacion: PropTypes.number,
    comentario: PropTypes.string,
    respuesta: PropTypes.string
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired
};

export function ReplyDialog({ review, ...props }) {
  return review ? <ReplyForm review={review} {...props} /> : null;
}

ReplyDialog.propTypes = { review: PropTypes.object };
