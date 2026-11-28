import "@fontsource-variable/bricolage-grotesque/standard.css";
import "@fontsource-variable/instrument-sans/index.css";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../../components/common/Icon";
import { Spinner } from "../../components/common/Spinner";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { complaintService } from "../../services/complaintService";
import { toApiError } from "../../api/apiErrors";
import { COMPLAINT_TYPES, DOCUMENT_TYPES, complaintPayload, complaintType, isFormal, validateComplaint } from "../../utils/complaints";
import { SUBSCRIPTION_PLANS } from "../../utils/subscriptionPlans";
import "../../styles/complaints.css";

// Datos del proveedor que exige la hoja de reclamación. Completa el RUC y la dirección legal antes de usarla con clientes reales.
const PROVIDER = { name: "Fidegresa", ruc: "", address: "", email: "contacto@fidegresa.com" };

const EMPTY = {
  type: "", fullName: "", documentType: "DNI", documentNumber: "", email: "", phone: "", address: "", businessName: "", planId: "",
  amount: "", detail: "", request: "", consent: false
};

function formatDate(value, withTime = false) {
  if (!value) return "";
  const date = withTime ? new Date(value) : new Date(`${value}T12:00:00`);
  return date.toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}) });
}

/** Libro de Reclamaciones de Fidegresa (/libro-de-reclamaciones): reclamo, queja, cancelación o comentario. */
export default function ComplaintsPage() {
  useDocumentTitle("Libro de Reclamaciones");
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const type = complaintType(values.type);
  const formal = isFormal(values.type);

  const change = event => {
    const { name, type: inputType, value, checked } = event.target;
    setValues(previous => ({ ...previous, [name]: inputType === "checkbox" ? checked : value }));
    if (errors[name]) setErrors(previous => ({ ...previous, [name]: undefined }));
  };

  const chooseType = id => {
    setValues(previous => ({ ...previous, type: id }));
    setErrors({});
    setServerError("");
  };

  const submit = async event => {
    event.preventDefault();
    if (sending) return;
    const found = validateComplaint(values);
    setErrors(found);
    setServerError("");
    const first = Object.keys(found)[0];
    if (first) {
      document.querySelector(first === "type" ? "[name='type']" : `[name="${first}"]`)?.focus();
      return;
    }
    setSending(true);
    try {
      setResult(await complaintService.submit(complaintPayload(values)));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setServerError(toApiError(error).message);
    } finally {
      setSending(false);
    }
  };

  const field = (name, label, input, { optional = false, hint } = {}) => (
    <label className="lr-field">
      <span>{label}{optional && <em> (opcional)</em>}</span>
      {input}
      {errors[name] ? <small className="lr-error" id={`lr-e-${name}`}>{errors[name]}</small> : hint ? <small className="lr-hint">{hint}</small> : null}
    </label>
  );
  const invalid = name => (errors[name] ? { "aria-invalid": "true", "aria-describedby": `lr-e-${name}` } : {});

  return (
    <main className="lr-page">
      <header className="lr-top">
        <Link className="lr-brand" to="/"><img src="/favicon.svg" alt="" width="34" height="34" />Fidegresa</Link>
        <Link className="lr-back" to="/">Volver a Fidegresa</Link>
      </header>

      <div className="lr-shell">
        {result ? (
          <section className="lr-done" aria-labelledby="lr-done-title">
            <span className="lr-done-badge"><Icon name="mail" size={16} />Solicitud registrada</span>
            <h1 id="lr-done-title">Recibimos tu {result.typeLabel.toLowerCase()}</h1>
            <p>Guarda tu número de hoja: es tu constancia. Te enviamos una copia a <strong>{result.email}</strong>.</p>
            <dl className="lr-receipt">
              <div><dt>Número</dt><dd>{result.code}</dd></div>
              <div><dt>Tipo</dt><dd>{result.typeLabel}</dd></div>
              <div><dt>Fecha</dt><dd>{formatDate(result.createdAt, true)}</dd></div>
              <div><dt>{result.type === "COMENTARIO" ? "Si necesita respuesta, a más tardar" : "Respuesta a más tardar"}</dt><dd>{formatDate(result.responseDueBy)}</dd></div>
            </dl>
            {isFormal(result.type) && (
              <p className="lr-note">Responderemos por correo en un plazo máximo de 15 días hábiles. La formulación del reclamo no impide acudir a otras vías de solución de controversias ni es requisito previo para interponer una denuncia ante el INDECOPI.</p>
            )}
            <div className="lr-done-actions">
              <button type="button" className="lr-secondary" onClick={() => window.print()}><Icon name="file" size={17} />Imprimir constancia</button>
              <Link className="lr-primary" to="/">Volver al inicio</Link>
            </div>
          </section>
        ) : (
          <>
            <section className="lr-intro">
              <span className="lr-kicker">Atención al cliente</span>
              <h1>Libro de Reclamaciones</h1>
              <p>
                Conforme al Código de Protección y Defensa del Consumidor (Ley N.° 29571), aquí puedes registrar un reclamo o una queja sobre
                Fidegresa. También puedes pedir la cancelación de tu plan o dejarnos un comentario. Cada solicitud recibe un número y una copia por correo.
              </p>
              <dl className="lr-provider">
                <div><dt>Proveedor</dt><dd>{PROVIDER.name}</dd></div>
                {PROVIDER.ruc && <div><dt>RUC</dt><dd>{PROVIDER.ruc}</dd></div>}
                {PROVIDER.address && <div><dt>Dirección</dt><dd>{PROVIDER.address}</dd></div>}
                <div><dt>Correo</dt><dd><a href={`mailto:${PROVIDER.email}`}>{PROVIDER.email}</a></dd></div>
              </dl>
            </section>

            <form className="lr-form" onSubmit={submit} noValidate>
              <fieldset className="lr-types">
                <legend><b>1</b>¿Qué quieres registrar?</legend>
                <div className="lr-type-grid">
                  {COMPLAINT_TYPES.map(option => (
                    <label key={option.id} className={`lr-type${values.type === option.id ? " selected" : ""}`}>
                      <input type="radio" name="type" value={option.id} checked={values.type === option.id} onChange={() => chooseType(option.id)} />
                      <strong>{option.label}</strong>
                      <small>{option.description}</small>
                    </label>
                  ))}
                </div>
                {errors.type && <small className="lr-error">{errors.type}</small>}
              </fieldset>

              {type && (
                <>
                  <fieldset className="lr-section">
                    <legend><b>2</b>Tus datos</legend>
                    <div className="lr-grid">
                      {field("fullName", "Nombre completo", <input name="fullName" autoComplete="name" maxLength={120} value={values.fullName} onChange={change} {...invalid("fullName")} />)}
                      <div className="lr-doc">
                        {field("documentType", "Documento", (
                          <select name="documentType" value={values.documentType} onChange={change}>
                            {DOCUMENT_TYPES.map(document => <option key={document.id} value={document.id}>{document.label}</option>)}
                          </select>
                        ))}
                        {field("documentNumber", "Número", <input name="documentNumber" inputMode={values.documentType === "DNI" || values.documentType === "RUC" ? "numeric" : "text"} maxLength={15} value={values.documentNumber} onChange={change} {...invalid("documentNumber")} />)}
                      </div>
                      {field("email", "Correo electrónico", <input name="email" type="email" autoComplete="email" maxLength={160} value={values.email} onChange={change} {...invalid("email")} />, { hint: "Ahí te enviaremos la copia y la respuesta." })}
                      {field("phone", "Teléfono", <input name="phone" type="tel" autoComplete="tel" maxLength={20} value={values.phone} onChange={change} {...invalid("phone")} />, { optional: true })}
                      {field("address", "Domicilio o dirección del negocio", <input name="address" autoComplete="street-address" maxLength={200} value={values.address} onChange={change} {...invalid("address")} />, { optional: !formal })}
                      {field("businessName", "Nombre de tu negocio", <input name="businessName" autoComplete="organization" maxLength={120} value={values.businessName} onChange={change} />, { optional: true })}
                      {field("planId", "Plan contratado", (
                        <select name="planId" value={values.planId} onChange={change}>
                          <option value="">No tengo un plan / No lo sé</option>
                          {SUBSCRIPTION_PLANS.map(plan => <option key={plan.id} value={plan.id}>{plan.name} · S/ {plan.price}.00 al mes</option>)}
                        </select>
                      ), { optional: true })}
                      {values.type === "RECLAMO" && field("amount", "Monto reclamado (S/)", <input name="amount" inputMode="decimal" placeholder="0.00" value={values.amount} onChange={change} {...invalid("amount")} />, { optional: true })}
                    </div>
                  </fieldset>

                  <fieldset className="lr-section">
                    <legend><b>3</b>{type.label}</legend>
                    {field("detail", type.detailLabel, <textarea name="detail" rows={5} maxLength={2000} value={values.detail} onChange={change} {...invalid("detail")} />, { hint: `${values.detail.length}/2000` })}
                    {type.requestLabel && field("request", type.requestLabel, <textarea name="request" rows={3} maxLength={1000} value={values.request} onChange={change} {...invalid("request")} />)}
                    {formal && (
                      <p className="lr-note">
                        <strong>Reclamo:</strong> disconformidad relacionada con el servicio contratado. <strong>Queja:</strong> malestar o descontento con la
                        atención, no relacionado con el servicio. Responderemos en un plazo máximo de 15 días hábiles. La formulación del reclamo no impide
                        acudir a otras vías de solución de controversias ni es requisito previo para interponer una denuncia ante el INDECOPI.
                      </p>
                    )}
                  </fieldset>

                  <label className="lr-check">
                    <input type="checkbox" name="consent" checked={values.consent} onChange={change} {...invalid("consent")} />
                    <span>Acepto que Fidegresa trate mis datos para atender esta solicitud, conforme a la <Link to="/privacidad" target="_blank">Política de privacidad</Link>.</span>
                  </label>
                  {errors.consent && <small className="lr-error">{errors.consent}</small>}

                  {serverError && <p className="lr-server-error" role="alert">{serverError}</p>}
                  <button type="submit" className="lr-primary lr-submit" disabled={sending}>
                    {sending ? <Spinner /> : <Icon name="mail" size={18} />}
                    {sending ? "Enviando…" : `Enviar ${type.id === "COMENTARIO" ? "comentario" : type.id === "CANCELACION" ? "solicitud" : type.label.toLowerCase()}`}
                  </button>
                </>
              )}
            </form>
          </>
        )}
      </div>
      <footer className="lr-footer">© {new Date().getFullYear()} Fidegresa · <a href={`mailto:${PROVIDER.email}`}>{PROVIDER.email}</a></footer>
    </main>
  );
}
