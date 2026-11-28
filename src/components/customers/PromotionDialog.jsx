import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Modal } from "../common/Modal";
import { FormField } from "../common/FormField";
import { useFetch } from "../../hooks/useFetch";
import { promotionService } from "../../services/promotionService";
import { loyaltyProgramService } from "../../services/loyaltyProgramService";
import { toApiError } from "../../api/apiErrors";

const DAY = 24 * 60 * 60 * 1000;
// Fecha local en formato AAAA-MM-DD (la que espera el backend y el input type="date").
const localDay = (offset = 0) => new Date(Date.now() + offset * DAY).toLocaleDateString("en-CA");

/** Textos de partida para cada grupo: el dueño los puede cambiar antes de lanzar. */
export const PROMOTION_PRESETS = {
  LOYAL: {
    title: "Premiar a mis mejores clientes",
    subtitle: "Un descuento de agradecimiento para quienes vienen seguido.",
    name: "Gracias por ser de la casa",
    description: "Por venir tan seguido, tu próxima compra tiene descuento. ¡Te esperamos!",
    discountType: "PERCENT",
    discountValue: "10",
    days: 30
  },
  AT_RISK: {
    title: "Invitar a volver",
    subtitle: "Un descuento para que regresen quienes dejaron de venir.",
    name: "Te extrañamos",
    description: "Hace tiempo no te vemos. Vuelve esta semana y tu compra tiene descuento.",
    discountType: "PERCENT",
    discountValue: "15",
    days: 14
  }
};

/** Grupos que puede proponer la recomendación con IA, además de fieles y en riesgo. */
const SEGMENT_TEXT = {
  LOYAL: "tus clientes fieles",
  AT_RISK: "quienes dejaron de venir",
  NEW: "los clientes nuevos",
  BIRTHDAY: "quienes cumplen años este mes",
  ALL: "todos tus clientes"
};

/** Formulario inicial: el borrador de la IA (si lo hay) o los textos de partida del grupo. */
function initialForm(segment, draft) {
  if (draft) {
    const today = localDay();
    return {
      name: String(draft.name || "").slice(0, 80),
      description: String(draft.description || "").slice(0, 240),
      discountType: draft.discountType === "AMOUNT" ? "AMOUNT" : "PERCENT",
      discountValue: String(draft.discountValue ?? ""),
      programId: draft.programId ? String(draft.programId) : "",
      startsOn: draft.startsOn && draft.startsOn >= today ? draft.startsOn : today,
      endsOn: draft.endsOn && draft.endsOn >= today ? draft.endsOn : localDay(6)
    };
  }
  const preset = PROMOTION_PRESETS[segment];
  return {
    name: preset.name,
    description: preset.description,
    discountType: preset.discountType,
    discountValue: preset.discountValue,
    programId: "",
    startsOn: localDay(),
    endsOn: localDay(preset.days - 1)
  };
}

function validate(form) {
  const errors = {};
  const name = form.name.trim();
  const value = Number(form.discountValue);
  if (!name) errors.name = "Escribe el nombre de la promoción.";
  else if (name.length > 80) errors.name = "Hasta 80 caracteres.";
  if (form.description.trim().length > 240) errors.description = "Hasta 240 caracteres.";
  if (!(value > 0)) errors.discountValue = "El descuento debe ser mayor que cero.";
  else if (!/^\d+(\.\d{1,2})?$/.test(String(form.discountValue).trim())) errors.discountValue = "Usa hasta 2 decimales.";
  else if (form.discountType === "PERCENT" && value >= 100) errors.discountValue = "El porcentaje debe ser menor que 100.";
  else if (form.discountType === "AMOUNT" && value > 10000) errors.discountValue = "Hasta S/ 10 000.";
  if (!form.startsOn) errors.startsOn = "Elige la fecha de inicio.";
  if (!form.endsOn) errors.endsOn = "Elige la fecha de fin.";
  else if (form.endsOn < localDay()) errors.endsOn = "La fecha de fin ya pasó.";
  else if (form.startsOn && form.endsOn < form.startsOn) errors.endsOn = "Debe ser igual o posterior al inicio.";
  else if (form.startsOn && (new Date(form.endsOn) - new Date(form.startsOn)) / DAY > 366) errors.endsOn = "Puede durar hasta un año.";
  return errors;
}

/**
 * Crea una promoción para un grupo de clientes (fieles o en riesgo, o el que propuso la IA con draft).
 * El backend la aplica en caja y, si ya empezó, avisa en la tarjeta de Google Wallet de cada cliente.
 */
export function PromotionDialog({ open, segment, draft = null, onClose, onCreated }) {
  const [form, setForm] = useState(() => initialForm(segment, draft));
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [saving, setSaving] = useState(false);
  const preset = draft
    ? { title: "Promoción recomendada", subtitle: `Propuesta con IA para ${SEGMENT_TEXT[segment] || "tus clientes"}. Revísala y ajústala antes de lanzarla.` }
    : PROMOTION_PRESETS[segment];

  useEffect(() => {
    if (open) {
      setForm(initialForm(segment, draft));
      setErrors({});
      setServerError("");
    }
  }, [open, segment, draft]);

  const programsRequest = useFetch(({ signal }) => loyaltyProgramService.getAll({}, { signal }), [], { enabled: open });
  const programs = useMemo(
    () => (programsRequest.data || []).filter(program => program.estado === "Activa" && program.tipo !== "Giftcard"),
    [programsRequest.data]
  );
  const audience = useFetch(
    ({ signal }) => promotionService.previewAudience({ segment, programId: form.programId ? Number(form.programId) : null }, { signal }),
    [segment, form.programId],
    { enabled: open }
  );

  const set = field => event => {
    const value = event.target.value;
    setForm(previous => ({ ...previous, [field]: value }));
    setErrors(previous => ({ ...previous, [field]: undefined }));
  };

  const submit = async () => {
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    setServerError("");
    try {
      const created = await promotionService.create({
        name: form.name.trim(),
        description: form.description.trim() || null,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        programId: form.programId ? Number(form.programId) : null,
        segment,
        startsOn: form.startsOn,
        endsOn: form.endsOn,
        active: true
      });
      onCreated(created);
    } catch (error) {
      setServerError(toApiError(error).message);
    } finally {
      setSaving(false);
    }
  };

  const reach = audience.data;
  const empty = reach && reach.customers === 0;

  return (
    <Modal
      open={open}
      title={preset.title}
      subtitle={preset.subtitle}
      onClose={onClose}
      onSubmit={submit}
      submitLabel={form.startsOn > localDay() ? "Programar promoción" : "Lanzar promoción"}
      submitting={saving}
      submitDisabled={empty}
      wide
    >
      {draft?.reason && (
        <p className="ci-reason">
          <strong>Por qué esta promoción:</strong> {draft.reason}
        </p>
      )}
      <div className="ci-audience" aria-live="polite">
        {audience.error ? (
          <p className="ci-error">{toApiError(audience.error).message}</p>
        ) : !reach ? (
          <p>Calculando a cuántos clientes llega…</p>
        ) : empty ? (
          <p>Ahora no hay clientes en este grupo{form.programId ? " con esta tarjeta" : ""}. Prueba con otra tarjeta o más adelante.</p>
        ) : (
          <p>
            Llega a <strong>{reach.customers} {reach.customers === 1 ? "cliente" : "clientes"}</strong>.{" "}
            {reach.withWallet && reach.withWallet === reach.customers
              ? `${reach.customers === 1 ? "Tiene" : "Todos tienen"} la tarjeta en Google Wallet y ${reach.customers === 1 ? "recibirá" : "recibirán"} el aviso en el celular.`
              : reach.withWallet
              ? `${reach.withWallet} ${reach.withWallet === 1 ? "tiene" : "tienen"} su tarjeta en Google Wallet y ${reach.withWallet === 1 ? "recibirá" : "recibirán"} el aviso en el celular.`
              : "Ninguno tiene la tarjeta en Google Wallet: verán el descuento al pagar en caja."}
          </p>
        )}
      </div>

      <div className="form-grid">
        <FormField label="Nombre de la promoción" error={errors.name} hint="Lo ven tus clientes. Hasta 80 caracteres." full>
          <input className="form-control" maxLength={80} value={form.name} onChange={set("name")} />
        </FormField>
        <FormField label="Mensaje para tus clientes" error={errors.description} hint="Aparece en el aviso de Google Wallet. Hasta 240 caracteres." optional full>
          <textarea className="form-control" rows={3} maxLength={240} value={form.description} onChange={set("description")} />
        </FormField>
        <FormField label="Tipo de descuento">
          <select className="form-control" value={form.discountType} onChange={set("discountType")}>
            <option value="PERCENT">Porcentaje (%)</option>
            <option value="AMOUNT">Monto fijo (S/)</option>
          </select>
        </FormField>
        <FormField label={form.discountType === "PERCENT" ? "Descuento en %" : "Descuento en soles"} error={errors.discountValue}>
          <input className="form-control" type="number" inputMode="decimal" min="0" step="0.5" value={form.discountValue} onChange={set("discountValue")} />
        </FormField>
        <FormField label="Desde" error={errors.startsOn}>
          <input className="form-control" type="date" min={localDay()} value={form.startsOn} onChange={set("startsOn")} />
        </FormField>
        <FormField label="Hasta" error={errors.endsOn}>
          <input className="form-control" type="date" min={form.startsOn || localDay()} value={form.endsOn} onChange={set("endsOn")} />
        </FormField>
        <FormField label="Tarjeta" hint="Déjalo en “Todas” para que valga con cualquier tarjeta del negocio." full>
          <select className="form-control" value={form.programId} onChange={set("programId")}>
            <option value="">Todas las tarjetas</option>
            {programs.map(program => <option key={program.id} value={program.id}>{program.nombre} ({program.negocio})</option>)}
          </select>
        </FormField>
      </div>
      {serverError && <p className="ci-error" role="alert">{serverError}</p>}
    </Modal>
  );
}

PromotionDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  segment: PropTypes.oneOf(["LOYAL", "AT_RISK", "NEW", "BIRTHDAY", "ALL"]).isRequired,
  draft: PropTypes.shape({
    name: PropTypes.string,
    description: PropTypes.string,
    discountType: PropTypes.string,
    discountValue: PropTypes.number,
    programId: PropTypes.number,
    startsOn: PropTypes.string,
    endsOn: PropTypes.string,
    reason: PropTypes.string
  }),
  onClose: PropTypes.func.isRequired,
  onCreated: PropTypes.func.isRequired
};
