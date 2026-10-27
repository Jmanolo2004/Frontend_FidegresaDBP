import PropTypes from "prop-types";
import { Modal } from "../common/Modal";
import { FormField } from "../common/FormField";
import { useForm } from "../../hooks/useForm";
import { useSettings } from "../../hooks/useSettings";
import { useToast } from "../../hooks/useToast";
import { useAuth } from "../../hooks/useAuth";
import { email, maxLength, required } from "../../utils/validators";

const rules = {
  perfilNombre: [required("Escribe tu nombre."), maxLength(60, "Usa hasta 60 caracteres.")],
  perfilCorreo: [required("Escribe tu correo."), email()],
  perfilTelefono: [value => (!value || /^[\d\s+()-]{6,20}$/.test(value) ? "" : "Escribe un teléfono válido, por ejemplo 999 123 456.")]
};

function ProfileForm({ onClose }) {
  const { settings, updateSettings } = useSettings();
  const { updateUser } = useAuth();
  const { showToast, showError } = useToast();
  const form = useForm({
    initialValues: {
      perfilNombre: settings.perfilNombre || "",
      perfilCorreo: settings.perfilCorreo || "",
      perfilTelefono: settings.perfilTelefono || ""
    },
    rules,
    onSubmit: async values => {
      try {
        await updateSettings(values);
        updateUser({ fullName: values.perfilNombre });
        showToast("Perfil actualizado.");
        onClose();
      } catch (error) {
        showError(error.message);
      }
    }
  });

  return (
    <Modal open title="Mi perfil" subtitle="Actualiza los datos de tu cuenta administradora" onClose={onClose} onSubmit={form.handleSubmit} submitLabel="Guardar perfil" submitting={form.isSubmitting}>
      <div className="form-grid">
        <FormField label="Nombre" error={form.errors.perfilNombre} full>
          <input className="form-control" autoComplete="name" maxLength={60} {...form.getFieldProps("perfilNombre")} />
        </FormField>
        <FormField label="Correo electrónico" error={form.errors.perfilCorreo} full>
          <input className="form-control" type="email" autoComplete="email" maxLength={100} {...form.getFieldProps("perfilCorreo")} />
        </FormField>
        <FormField label="Teléfono" error={form.errors.perfilTelefono} optional full>
          <input className="form-control" type="tel" autoComplete="tel" maxLength={20} placeholder="Ej. 999 123 456" {...form.getFieldProps("perfilTelefono")} />
        </FormField>
      </div>
    </Modal>
  );
}

ProfileForm.propTypes = { onClose: PropTypes.func.isRequired };

export function ProfileDialog({ open, onClose }) {
  return open ? <ProfileForm onClose={onClose} /> : null;
}

ProfileDialog.propTypes = { open: PropTypes.bool.isRequired, onClose: PropTypes.func.isRequired };
