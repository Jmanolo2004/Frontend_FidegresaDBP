import PropTypes from "prop-types";
import { Modal } from "../common/Modal";
import { FormField } from "../common/FormField";
import { useForm } from "../../hooks/useForm";
import { useSettings } from "../../hooks/useSettings";
import { useToast } from "../../hooks/useToast";
import { maxLength, required } from "../../utils/validators";

const rules = { marca: [required("Escribe el nombre del programa."), maxLength(50, "Usa hasta 50 caracteres.")] };

function BrandNameForm({ onClose }) {
  const { settings, updateSettings } = useSettings();
  const { showToast, showError } = useToast();
  const form = useForm({
    initialValues: { marca: settings.marca || "" },
    rules,
    onSubmit: async values => {
      try {
        await updateSettings({ marca: values.marca.trim() });
        showToast("Nombre del programa actualizado.");
        onClose();
      } catch (error) {
        showError(error.message);
      }
    }
  });

  return (
    <Modal open title="Nombre del programa" subtitle="Actualiza el nombre que aparece en tus tarjetas." onClose={onClose} onSubmit={form.handleSubmit} submitLabel="Guardar" submitting={form.isSubmitting}>
      <FormField label="Nombre del programa" error={form.errors.marca}>
        <input className="form-control" maxLength={50} autoFocus {...form.getFieldProps("marca")} />
      </FormField>
    </Modal>
  );
}

BrandNameForm.propTypes = { onClose: PropTypes.func.isRequired };

export function BrandNameDialog({ open, onClose }) {
  return open ? <BrandNameForm onClose={onClose} /> : null;
}

BrandNameDialog.propTypes = { open: PropTypes.bool.isRequired, onClose: PropTypes.func.isRequired };
