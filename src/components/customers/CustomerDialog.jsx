import PropTypes from "prop-types";
import { Modal } from "../common/Modal";
import { FormField } from "../common/FormField";
import { useForm } from "../../hooks/useForm";
import { useToast } from "../../hooks/useToast";
import { customerService } from "../../services/customerService";
import { email, maxLength, required } from "../../utils/validators";

const rules = {
  fullName: [required("Escribe el nombre del cliente."), maxLength(120, "Usa hasta 120 caracteres.")],
  email: [required("Escribe el correo del cliente."), email()],
  phone: [value => (!value || /^[\d\s+()-]{6,20}$/.test(value) ? "" : "Escribe un teléfono válido, por ejemplo 999 123 456.")],
  localId: [required("Elige el local donde se registró.")]
};

function CustomerForm({ locations, onClose, onCreated }) {
  const { showToast, showError } = useToast();
  const form = useForm({
    initialValues: { fullName: "", email: "", phone: "", localId: String(locations[0]?.id ?? "") },
    rules,
    onSubmit: async (values, { setErrors }) => {
      try {
        const customer = await customerService.create({ ...values, localId: Number(values.localId) });
        showToast(`${customer.nombre} se unió a tu programa.`);
        onCreated(customer);
      } catch (error) {
        if (error.status === 409) setErrors({ email: error.message });
        else showError(error.message);
      }
    }
  });

  return (
    <Modal open title="Agregar cliente" subtitle="Registra a una persona que cambia su tarjeta física por la digital." onClose={onClose} onSubmit={form.handleSubmit} submitLabel="Agregar cliente" submitting={form.isSubmitting}>
      <div className="form-grid">
        <FormField label="Nombre completo" error={form.errors.fullName} full>
          <input className="form-control" autoComplete="off" maxLength={120} placeholder="Ej. Lucía Martínez" {...form.getFieldProps("fullName")} />
        </FormField>
        <FormField label="Correo electrónico" error={form.errors.email}>
          <input className="form-control" type="email" maxLength={120} placeholder="cliente@correo.pe" {...form.getFieldProps("email")} />
        </FormField>
        <FormField label="Teléfono" error={form.errors.phone} optional>
          <input className="form-control" type="tel" maxLength={20} placeholder="999 123 456" {...form.getFieldProps("phone")} />
        </FormField>
        <FormField label="Local de registro" error={form.errors.localId} full>
          <select className="form-control" {...form.getFieldProps("localId")}>
            {locations.map(location => (
              <option key={location.id} value={location.id}>
                {location.nombre} · {location.distrito}
              </option>
            ))}
          </select>
        </FormField>
      </div>
    </Modal>
  );
}

CustomerForm.propTypes = {
  locations: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.number, nombre: PropTypes.string, distrito: PropTypes.string })).isRequired,
  onClose: PropTypes.func.isRequired,
  onCreated: PropTypes.func.isRequired
};

export function CustomerDialog({ open, ...props }) {
  return open ? <CustomerForm {...props} /> : null;
}

CustomerDialog.propTypes = { open: PropTypes.bool.isRequired };
