import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Modal } from "../common/Modal";
import { FormField } from "../common/FormField";
import { useToast } from "../../hooks/useToast";
import { menuService } from "../../services/menuService";

/** Edita el pop-up "Invitación a Club": textos, programa al que se une el cliente y si está activo. */
export function InvitationDialog({ open, branchId, invitation, programs, onClose, onSaved }) {
  const { showToast, showError } = useToast();
  const [form, setForm] = useState({ title: "", text: "", buttonLabel: "", programId: "", active: true });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !invitation) return;
    setForm({
      title: invitation.title || "",
      text: invitation.text || "",
      buttonLabel: invitation.buttonLabel || "",
      programId: invitation.program?.id ? String(invitation.program.id) : programs[0] ? String(programs[0].id) : "",
      active: invitation.configured ? invitation.active : true
    });
    setErrors({});
  }, [open, invitation, programs]);

  const change = field => event => setForm(previous => ({ ...previous, [field]: event.target.value }));

  const submit = async () => {
    const found = {};
    if (!form.title.trim()) found.title = "Escribe el título.";
    if (!form.text.trim()) found.text = "Escribe el texto.";
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    try {
      const saved = await menuService.saveInvitation(branchId, {
        title: form.title.trim(),
        text: form.text.trim(),
        buttonLabel: form.buttonLabel.trim(),
        programId: form.programId ? Number(form.programId) : null,
        active: form.active
      });
      showToast("Invitación guardada.");
      onSaved(saved);
    } catch (error) {
      showError(error.message || "No pudimos guardar la invitación.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title="Invitación a Club" subtitle="El pop-up que ven tus clientes al abrir tu menú." onClose={onClose} onSubmit={submit} submitting={saving}>
      <div className="form-grid">
        <FormField label="Título" error={errors.title} full>
          <input className="form-control" maxLength={80} value={form.title} onChange={change("title")} />
        </FormField>
        <FormField label="Texto" error={errors.text} full>
          <textarea className="form-control" rows={3} maxLength={240} value={form.text} onChange={change("text")} />
        </FormField>
        <FormField label="Texto del botón" optional>
          <input className="form-control" maxLength={30} placeholder="Unirse ahora" value={form.buttonLabel} onChange={change("buttonLabel")} />
        </FormField>
        <FormField label="Estado">
          <select className="form-control" value={form.active ? "si" : "no"} onChange={event => setForm(previous => ({ ...previous, active: event.target.value === "si" }))}>
            <option value="si">Activa</option>
            <option value="no">En pausa</option>
          </select>
        </FormField>
        <FormField label="Tarjeta que recibe el cliente" hint={programs.length ? undefined : "Este local no tiene tarjetas activas: crea una en Tarjetas."} full>
          <select className="form-control" value={form.programId} onChange={change("programId")}>
            <option value="">Sin tarjeta</option>
            {programs.map(program => (
              <option key={program.id} value={program.id}>
                {program.nombre} · {program.tipo}
              </option>
            ))}
          </select>
        </FormField>
      </div>
    </Modal>
  );
}

InvitationDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  branchId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  invitation: PropTypes.object,
  programs: PropTypes.array.isRequired,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired
};
