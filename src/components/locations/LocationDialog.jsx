import PropTypes from "prop-types";
import { Modal } from "../common/Modal";
import { FormField } from "../common/FormField";
import { useForm } from "../../hooks/useForm";
import { useToast } from "../../hooks/useToast";
import { branchService } from "../../services/branchService";
import { BUSINESS_CATEGORIES, DISTRICT_NAMES } from "../../utils/constants";
import { maxLength, required } from "../../utils/validators";

const rules = {
  nombre: [required("Escribe el nombre del local."), maxLength(50, "Usa hasta 50 caracteres.")],
  categoria: [required("Elige el tipo de negocio.")],
  distrito: [required("Elige el distrito.")],
  direccion: [required("Escribe la dirección o una referencia."), maxLength(100, "Usa hasta 100 caracteres.")],
  horario: [maxLength(60, "Usa hasta 60 caracteres.")]
};

function LocationForm({ location, onClose, onSaved }) {
  const { showToast, showError } = useToast();
  const editing = Boolean(location);
  const categories = location?.categoria && !BUSINESS_CATEGORIES.includes(location.categoria) ? [...BUSINESS_CATEGORIES, location.categoria] : BUSINESS_CATEGORIES;

  const form = useForm({
    initialValues: {
      nombre: location?.nombre || "",
      categoria: location?.categoria || BUSINESS_CATEGORIES[0],
      distrito: location?.distrito || DISTRICT_NAMES[0],
      direccion: location?.direccion || "",
      horario: location?.horario === "Horario por definir" ? "" : location?.horario || ""
    },
    rules,
    onSubmit: async (values, { setErrors }) => {
      try {
        const saved = editing ? await branchService.update(location.id, values) : await branchService.create(values);
        showToast(editing ? "Ubicación actualizada." : "Ubicación agregada.");
        onSaved(saved);
      } catch (error) {
        if (error.status === 409) setErrors({ nombre: error.message });
        else showError(error.message);
      }
    }
  });

  return (
    <Modal
      open
      title={editing ? "Editar ubicación" : "Agregar ubicación"}
      subtitle={editing ? "Actualiza los datos visibles de este local." : "Suma un local al programa Fidegresa."}
      onClose={onClose}
      onSubmit={form.handleSubmit}
      submitLabel={editing ? "Guardar cambios" : "Agregar ubicación"}
      submitting={form.isSubmitting}
    >
      <div className="form-grid">
        <FormField label="Nombre del negocio" error={form.errors.nombre} full>
          <input className="form-control" maxLength={50} placeholder="Ej. Café de la Plaza" {...form.getFieldProps("nombre")} />
        </FormField>
        <FormField label="Tipo de negocio" error={form.errors.categoria}>
          <select className="form-control" {...form.getFieldProps("categoria")}>
            {categories.map(category => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Distrito" error={form.errors.distrito}>
          <select className="form-control" {...form.getFieldProps("distrito")}>
            {DISTRICT_NAMES.map(district => (
              <option key={district}>{district}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Dirección o referencia" error={form.errors.direccion} full>
          <input className="form-control" maxLength={100} placeholder="Av. o referencia dentro del distrito" {...form.getFieldProps("direccion")} />
        </FormField>
        <FormField label="Horario de atención" error={form.errors.horario} optional full>
          <input className="form-control" maxLength={60} placeholder="Lun a sáb · 9:00 a 18:00" {...form.getFieldProps("horario")} />
        </FormField>
      </div>
    </Modal>
  );
}

LocationForm.propTypes = { location: PropTypes.object, onClose: PropTypes.func.isRequired, onSaved: PropTypes.func.isRequired };

export function LocationDialog({ open, ...props }) {
  return open ? <LocationForm {...props} /> : null;
}

LocationDialog.propTypes = { open: PropTypes.bool.isRequired };
