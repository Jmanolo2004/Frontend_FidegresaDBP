import PropTypes from "prop-types";
import { FormField } from "../common/FormField";
import { Modal } from "../common/Modal";
import { useForm } from "../../hooks/useForm";
import { useToast } from "../../hooks/useToast";
import { teamService } from "../../services/teamService";
import { email, maxLength, required } from "../../utils/validators";

const rules = {
  name: [required("Escribe el nombre del miembro."), maxLength(100, "Usa hasta 100 caracteres.")],
  email: [required("Escribe el correo del miembro."), email(), maxLength(160, "Usa hasta 160 caracteres.")],
  branchIds: [value => value.length ? "" : "Selecciona al menos un local."],
  currentBranchId: [(value, values) => values.branchIds.includes(Number(value)) ? "" : "Selecciona un local actual."]
};

function TeamMemberForm({ member, branches, onClose, onSaved }) {
  const { showError, showToast } = useToast();
  const form = useForm({
    initialValues: {
      name: member?.name || "",
      email: member?.email || "",
      role: member?.role || "Trabajador",
      branchIds: member?.branchIds || [],
      currentBranchId: member?.currentBranchId || ""
    },
    rules,
    onSubmit: async (values, { setErrors }) => {
      try {
        if (member) await teamService.update(member.id, values);
        else await teamService.create(values);
        showToast(member ? "Miembro de demostración actualizado." : "Miembro de demostración agregado. No se envió ninguna invitación.");
        onSaved();
      } catch (error) {
        if (error.status === 409) setErrors({ email: error.message });
        else showError(error.message);
      }
    }
  });

  const toggleBranch = (id, checked) => {
    const selected = checked ? [...form.values.branchIds, id] : form.values.branchIds.filter(branchId => branchId !== id);
    form.setFieldValue("branchIds", selected);
    if (!selected.includes(Number(form.values.currentBranchId))) {
      form.setFieldValue("currentBranchId", selected[0] || "");
    }
  };
  const selectedBranches = branches.filter(branch => form.values.branchIds.includes(branch.id));

  return (
    <Modal open title={member ? "Editar miembro de demostración" : "Añadir miembro de demostración"} subtitle="Los datos se guardan solo en este navegador. No se envía una invitación ni se concede acceso real." onClose={onClose} onSubmit={form.handleSubmit} submitLabel={member ? "Guardar cambios" : "Agregar miembro"} submitting={form.isSubmitting}>
      <div className="form-grid">
        <FormField label="Nombre" error={form.errors.name} full>
          <input className="form-control" maxLength={100} autoComplete="name" {...form.getFieldProps("name")} />
        </FormField>
        <FormField label="Correo electrónico" error={form.errors.email} full>
          <input className="form-control" type="email" maxLength={160} autoComplete="email" {...form.getFieldProps("email")} />
        </FormField>
        <FormField label="Rol simulado">
          <select className="form-control" {...form.getFieldProps("role")}>
            <option>Trabajador</option>
            <option>Administrador</option>
          </select>
        </FormField>
        <FormField label="Local actual" error={form.errors.currentBranchId}>
          <select className="form-control" {...form.getFieldProps("currentBranchId")}>
            <option value="">Selecciona un local</option>
            {selectedBranches.map(branch => <option key={branch.id} value={branch.id}>{branch.nombre}</option>)}
          </select>
        </FormField>
        <fieldset className="team-branches full" aria-describedby={form.errors.branchIds ? "team-branches-error" : undefined}>
          <legend>Acceso simulado a los locales</legend>
          {branches.map(branch => (
            <label key={branch.id}>
              <input type="checkbox" checked={form.values.branchIds.includes(branch.id)} onChange={event => toggleBranch(branch.id, event.target.checked)} />
              {branch.nombre}
            </label>
          ))}
          {form.errors.branchIds && <small className="field-error" id="team-branches-error" role="alert">{form.errors.branchIds}</small>}
        </fieldset>
      </div>
    </Modal>
  );
}

TeamMemberForm.propTypes = {
  member: PropTypes.object,
  branches: PropTypes.array.isRequired,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired
};

export function TeamMemberDialog({ open, ...props }) {
  return open ? <TeamMemberForm {...props} /> : null;
}

TeamMemberDialog.propTypes = { open: PropTypes.bool.isRequired };
