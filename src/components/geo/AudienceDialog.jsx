import PropTypes from "prop-types";
import { Modal } from "../common/Modal";
import { FormField } from "../common/FormField";
import { Avatar } from "../common/Avatar";
import { useForm } from "../../hooks/useForm";
import { useToast } from "../../hooks/useToast";
import { geoService } from "../../services/geoService";
import { maxLength, required } from "../../utils/validators";
import { pluralize } from "../../utils/format";

const rules = { mensaje: [required("Escribe un mensaje para la audiencia."), maxLength(240, "Usa hasta 240 caracteres.")] };

function AudienceForm({ location, radius, recipients, onClose }) {
  const { showToast, showError } = useToast();
  const form = useForm({
    initialValues: { mensaje: "" },
    rules,
    onSubmit: async values => {
      try {
        await geoService.createAudience({ ubicacionId: location.id, radio: radius, clientes: recipients.map(person => person.id), mensaje: values.mensaje.trim() });
        showToast(`Campaña creada para ${pluralize(recipients.length, "cliente", "clientes")}.`);
        onClose();
      } catch (error) {
        showError(error.message);
      }
    }
  });

  return (
    <Modal open wide title="Crear audiencia" subtitle={`${location.nombre} · ${radius} m · ${location.distrito}`} onClose={onClose} onSubmit={form.handleSubmit} submitLabel="Enviar notificación" submitting={form.isSubmitting} submitDisabled={!recipients.length}>
      <div className="audience-count">
        <span>Personas que recibirían el aviso</span>
        <strong>{recipients.length}</strong>
      </div>
      <ul className="audience-recipient-list">
        {recipients.length ? (
          recipients.map(person => (
            <li key={person.id}>
              <Avatar name={person.nombre} initials={person.iniciales} />
              <span>
                <strong>{person.nombre}</strong>
                <small>
                  {person.distrito} · {person.distance} m
                </small>
              </span>
            </li>
          ))
        ) : (
          <li className="audience-empty">Aún no hay clientes en este radio. Amplía el alcance para crear una audiencia.</li>
        )}
      </ul>
      <FormField label="Mensaje de notificación" error={form.errors.mensaje} hint={`${form.values.mensaje.length}/240 caracteres.`}>
        <textarea className="form-control" rows={3} maxLength={240} placeholder="Escribe una invitación breve para tus clientes…" {...form.getFieldProps("mensaje")} />
      </FormField>
    </Modal>
  );
}

AudienceForm.propTypes = {
  location: PropTypes.shape({ id: PropTypes.number, nombre: PropTypes.string, distrito: PropTypes.string }).isRequired,
  radius: PropTypes.number.isRequired,
  recipients: PropTypes.array.isRequired,
  onClose: PropTypes.func.isRequired
};

export function AudienceDialog({ open, ...props }) {
  return open ? <AudienceForm {...props} /> : null;
}

AudienceDialog.propTypes = { open: PropTypes.bool.isRequired };
