import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Icon } from "../common/Icon";
import { QrCode } from "../common/QrCode";
import { publicMenuService } from "../../services/publicMenuService";
import { toApiError } from "../../api/apiErrors";

const EMPTY = { fullName: "", email: "", phone: "", birthday: "", programId: "", consent: false };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const BIRTHDAY = /^(0?[1-9]|[12]\d|3[01])\/(0?[1-9]|1[0-2])$/;

export const PROGRAM_LABELS = { Estampillas: "Estampillas", Cashback: "Cashback", Niveles: "Niveles", Giftcard: "Gift card" };

/** Las mismas reglas que valida el backend, para avisar antes de enviar. */
function validate(values, programs) {
  const errors = {};
  if (!values.fullName.trim()) errors.fullName = "Escribe tu nombre.";
  if (!EMAIL.test(values.email.trim())) errors.email = "Escribe un correo válido.";
  let digits = values.phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("51")) digits = digits.slice(2);
  if (digits.length !== 9 || !digits.startsWith("9")) errors.phone = "Escribe un celular de 9 dígitos que empiece con 9.";
  if (values.birthday.trim() && !BIRTHDAY.test(values.birthday.trim())) errors.birthday = "Escríbelo como día/mes, por ejemplo 25/12.";
  if (programs.length > 1 && !values.programId) errors.programId = "Elige el programa al que te quieres unir.";
  if (!values.consent) errors.consent = "Necesitamos tu permiso para crear tu tarjeta.";
  return errors;
}

/** Texto oscuro sobre colores claros (como el amarillo) y claro sobre colores oscuros, para que siempre se lea. */
function readableText(hex) {
  const value = /^#?([0-9a-f]{6})$/i.exec(String(hex || ""))?.[1];
  if (!value) return "#fffaf3";
  const [r, g, b] = [0, 2, 4].map(index => parseInt(value.slice(index, index + 2), 16) / 255)
    .map(channel => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.35 ? "#241510" : "#fffaf3";
}

async function share(link, businessName) {
  const text = `Únete al club de ${businessName} con mi enlace:`;
  if (navigator.share) {
    await navigator.share({ title: businessName, text, url: link }).catch(() => {});
    return "shared";
  }
  await navigator.clipboard?.writeText(link);
  return "copied";
}

export function JoinDialog({ open, onClose, slug, menu, referralCode }) {
  const dialogRef = useRef(null);
  const programs = menu.programs || [];
  const defaultProgram = menu.invitation?.programId || programs[0]?.id || "";
  const [values, setValues] = useState({ ...EMPTY, programId: String(defaultProgram) });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [shareState, setShareState] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const change = event => {
    const { name, type, value, checked } = event.target;
    setValues(previous => ({ ...previous, [name]: type === "checkbox" ? checked : value }));
    if (errors[name]) setErrors(previous => ({ ...previous, [name]: undefined }));
  };

  const submit = async event => {
    event.preventDefault();
    if (sending) return;
    const found = validate(values, programs);
    setErrors(found);
    setServerError("");
    if (Object.keys(found).length) {
      dialogRef.current?.querySelector(`[name="${Object.keys(found)[0]}"]`)?.focus();
      return;
    }
    setSending(true);
    try {
      const response = await publicMenuService.join(slug, {
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        birthday: values.birthday.trim() || null,
        consent: true,
        programId: Number(values.programId || defaultProgram),
        referralCode: referralCode || null
      });
      setResult(response);
    } catch (error) {
      setServerError(toApiError(error).message);
    } finally {
      setSending(false);
    }
  };

  const close = () => {
    if (!sending) onClose();
  };

  const card = result?.card;
  const firstName = (result?.customerName || "").split(" ")[0];

  return (
    <dialog className="pm-dialog" ref={dialogRef} onCancel={event => { event.preventDefault(); close(); }} aria-labelledby="pm-dialog-title">
      {open && (
        <div className="pm-sheet">
          <button type="button" className="pm-sheet-close" onClick={close} aria-label="Cerrar" disabled={sending}>
            <Icon name="close" size={18} />
          </button>

          {!result && (
            <form onSubmit={submit} noValidate>
              {menu.invitation?.imageUrl && <img className="pm-sheet-image" src={menu.invitation.imageUrlResolved} alt="" />}
              <h2 id="pm-dialog-title" className="pm-sheet-title">{menu.invitation?.title || `Únete al club de ${menu.business.name}`}</h2>
              <p className="pm-sheet-text">{menu.invitation?.text || "Recibe tu tarjeta digital y empieza a ganar beneficios desde hoy."}</p>

              <div className="pm-fields">
                <label className="pm-field">
                  <span>Nombre</span>
                  <input name="fullName" autoComplete="name" value={values.fullName} onChange={change} aria-invalid={errors.fullName ? "true" : undefined} />
                  {errors.fullName && <small className="pm-error">{errors.fullName}</small>}
                </label>
                <label className="pm-field">
                  <span>Correo</span>
                  <input name="email" type="email" inputMode="email" autoComplete="email" value={values.email} onChange={change} aria-invalid={errors.email ? "true" : undefined} />
                  {errors.email && <small className="pm-error">{errors.email}</small>}
                </label>
                <label className="pm-field">
                  <span>Celular</span>
                  <input name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="9XX XXX XXX" value={values.phone} onChange={change} aria-invalid={errors.phone ? "true" : undefined} />
                  {errors.phone && <small className="pm-error">{errors.phone}</small>}
                </label>
                <label className="pm-field">
                  <span>Cumpleaños <em>(opcional)</em></span>
                  <input name="birthday" inputMode="numeric" placeholder="25/12" value={values.birthday} onChange={change} aria-invalid={errors.birthday ? "true" : undefined} />
                  {errors.birthday ? <small className="pm-error">{errors.birthday}</small> : <small className="pm-hint">Para enviarte un detalle ese día.</small>}
                </label>
                {programs.length > 1 && (
                  <label className="pm-field">
                    <span>Programa</span>
                    <select name="programId" value={values.programId} onChange={change} aria-invalid={errors.programId ? "true" : undefined}>
                      {programs.map(program => <option key={program.id} value={program.id}>{program.name} · {PROGRAM_LABELS[program.type] || program.type}</option>)}
                    </select>
                    {errors.programId && <small className="pm-error">{errors.programId}</small>}
                  </label>
                )}
                <label className="pm-consent">
                  <input type="checkbox" name="consent" checked={values.consent} onChange={change} aria-invalid={errors.consent ? "true" : undefined} />
                  <span>{menu.consent?.text || `Acepto que ${menu.business.name} use mis datos para gestionar mi tarjeta de fidelización.`}</span>
                </label>
                {errors.consent && <small className="pm-error">{errors.consent}</small>}
              </div>

              {serverError && <p className="pm-server-error" role="alert">{serverError}</p>}
              <button type="submit" className="pm-primary" disabled={sending}>
                {sending ? "Creando tu tarjeta…" : menu.invitation?.buttonLabel || "Quiero mi tarjeta"}
              </button>
            </form>
          )}

          {result && card && (
            <div className="pm-success">
              <h2 id="pm-dialog-title" className="pm-sheet-title">
                {result.alreadyRegistered ? `¡Hola de nuevo, ${firstName}!` : `¡Ya eres parte del club, ${firstName}!`}
              </h2>
              <p className="pm-sheet-text">
                {result.alreadyRegistered ? "Ya eras parte del club. Esta es tu tarjeta." : "Tu tarjeta ya está lista. Muéstrala en caja en cada compra."}
              </p>
              <div className="pm-card" style={{ "--pm-card": card.primaryColor || "#241510", "--pm-card-text": readableText(card.primaryColor || "#241510") }}>
                <div className="pm-card-top">
                  <span>{menu.business.name}</span>
                  <strong>{card.programName}</strong>
                  <small>{PROGRAM_LABELS[card.programType] || card.programType}</small>
                </div>
                <div className="pm-card-qr">
                  <QrCode value={card.qrToken} size={188} label="Código QR de tu tarjeta" />
                  <code>{card.qrToken.replace(/^FDG-/, "")}</code>
                </div>
              </div>
              <p className="pm-hint pm-center">Toma una captura para tenerla a la mano.</p>
              {result.inviteLink && (
                <button
                  type="button"
                  className="pm-secondary"
                  onClick={async () => setShareState(await share(result.inviteLink, menu.business.name))}
                >
                  <Icon name="link" size={16} /> {shareState === "copied" ? "Enlace copiado" : "Invita a una amiga"}
                </button>
              )}
              <button type="button" className="pm-primary" onClick={onClose}>Ver el menú</button>
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}

JoinDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  slug: PropTypes.string.isRequired,
  menu: PropTypes.object.isRequired,
  referralCode: PropTypes.string
};
