import "@fontsource-variable/bricolage-grotesque/standard.css";
import "@fontsource-variable/instrument-sans/index.css";
import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Link, useParams } from "react-router-dom";
import { CardFront } from "../../components/cards/CardFront";
import { CARD_TYPE_CONFIG } from "../../components/cards/cardTypes";
import { Icon } from "../../components/common/Icon";
import { Spinner } from "../../components/common/Spinner";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useFetch } from "../../hooks/useFetch";
import { useLiveRefresh } from "../../hooks/useLiveRefresh";
import { publicCardService } from "../../services/publicCardService";
import { toApiError } from "../../api/apiErrors";
import { birthDateOf, previewName, validateJoin } from "../../utils/cardJoin";
import "../../styles/card-join.css";

const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const EMPTY = { firstName: "", lastName: "", email: "", day: "", month: "", year: "", marketingConsent: false };
const storageKey = code => `fidegresa.tarjeta.${code}`;

function readStoredCard(code) {
  try {
    return JSON.parse(localStorage.getItem(storageKey(code)) || "null");
  } catch {
    return null;
  }
}

function storeCard(code, value) {
  try {
    if (value) localStorage.setItem(storageKey(code), JSON.stringify(value));
    else localStorage.removeItem(storageKey(code));
  } catch {
    // Sin almacenamiento (modo privado): la tarjeta igual se muestra en esta visita.
  }
}

function GoogleWalletButton({ program, card, client }) {
  const [state, setState] = useState({ loading: false, error: "" });
  const save = async () => {
    setState({ loading: true, error: "" });
    try {
      // Se abre Google Wallet en la misma pestaña: ahí el cliente confirma "Guardar" y vuelve con su tarjeta.
      window.location.assign(await publicCardService.googleWalletLink({ qrToken: card.qrToken, program, client, card }));
    } catch (error) {
      setState({ loading: false, error: error.message });
    }
  };
  return (
    <div className="cj-wallet">
      <button type="button" className="cj-wallet-button" onClick={save} disabled={state.loading} aria-describedby={state.error ? "cj-wallet-error" : undefined}>
        {state.loading ? <Spinner /> : <span className="cj-wallet-mark" aria-hidden="true"><i /><i /><i /><i /></span>}
        <span>{state.loading ? "Abriendo Google Wallet…" : "Agregar a Google Wallet"}</span>
      </button>
      {state.error && <p className="cj-wallet-error" id="cj-wallet-error" role="alert">{state.error}</p>}
    </div>
  );
}

GoogleWalletButton.propTypes = { program: PropTypes.object.isRequired, card: PropTypes.object.isRequired, client: PropTypes.string.isRequired };

/** Tarjeta ya creada: QR real, datos en vivo (lo que suma el staff aparece solo) y botón de Google Wallet. */
function IssuedCard({ program, issued, onReset }) {
  const [card, setCard] = useState(issued.card);
  useLiveRefresh(async () => {
    try {
      setCard(await publicCardService.getCard(issued.card.qrToken));
    } catch {
      // Se reintenta en el siguiente ciclo.
    }
  }, 10000);
  const firstName = (issued.customerName || "").split(" ")[0];
  return (
    <section className="cj-done" aria-labelledby="cj-done-title">
      <span className="cj-done-badge"><Icon name="reward" size={16} />{issued.alreadyRegistered ? "Ya tenías tu tarjeta" : "Tarjeta creada"}</span>
      <h1 id="cj-done-title">{issued.alreadyRegistered ? `¡Hola de nuevo, ${firstName}!` : `¡Listo, ${firstName}!`}</h1>
      <p>Muestra este QR en caja en cada compra. Guárdala en Google Wallet para tenerla siempre a la mano y recibir tus beneficios.</p>
      <div className="cj-done-card">
        <CardFront card={program} size="md" client={card.cliente || issued.customerName} stamps={card.estampillas} points={card.puntos} balance={card.saldo} qrValue={card.qrToken} />
      </div>
      <GoogleWalletButton program={program} card={card} client={card.cliente || issued.customerName} />
      {issued.welcomeEmail && issued.email && (
        <p className="cj-done-mail"><Icon name="mail" size={16} /><span>Te enviamos la bienvenida a <strong>{issued.email}</strong>. Si no la ves, revisa spam.</span></p>
      )}
      <button type="button" className="cj-link-button" onClick={onReset}>¿No eres tú? Registrar a otra persona</button>
    </section>
  );
}

IssuedCard.propTypes = {
  program: PropTypes.object.isRequired,
  issued: PropTypes.shape({
    alreadyRegistered: PropTypes.bool,
    customerName: PropTypes.string,
    email: PropTypes.string,
    welcomeEmail: PropTypes.bool,
    card: PropTypes.object.isRequired
  }).isRequired,
  onReset: PropTypes.func.isRequired
};

export default function CardJoinPage() {
  const { code } = useParams();
  const form = useFetch(options => publicCardService.getForm(code, options), [code]);
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [sending, setSending] = useState(false);
  const [issued, setIssued] = useState(() => readStoredCard(code));
  const program = form.data?.tarjeta;
  useDocumentTitle(program ? `Tu tarjeta de ${program.negocio}` : "Crea tu tarjeta");

  useEffect(() => {
    setIssued(readStoredCard(code));
  }, [code]);

  const change = event => {
    const { name, type, value, checked } = event.target;
    setValues(previous => ({ ...previous, [name]: type === "checkbox" ? checked : value }));
    const errorKey = ["day", "month", "year"].includes(name) ? "birthDate" : name;
    if (errors[errorKey]) setErrors(previous => ({ ...previous, [errorKey]: undefined }));
  };

  const submit = async event => {
    event.preventDefault();
    if (sending) return;
    const found = validateJoin(values);
    setErrors(found);
    setServerError("");
    const firstError = Object.keys(found)[0];
    if (firstError) {
      document.querySelector(`[name="${firstError === "birthDate" ? "day" : firstError}"]`)?.focus();
      return;
    }
    setSending(true);
    try {
      const email = values.email.trim().toLowerCase();
      const response = await publicCardService.join(code, {
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email,
        birthDate: birthDateOf(values),
        marketingConsent: values.marketingConsent
      });
      const next = { ...response, email };
      storeCard(code, next);
      setIssued(next);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setServerError(toApiError(error).message);
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    storeCard(code, null);
    setIssued(null);
    setValues(EMPTY);
  };

  if (form.loading && !form.data) {
    return <main className="cj-page cj-center"><Spinner label="Cargando tu tarjeta" /><p>Cargando tu tarjeta…</p></main>;
  }
  if (form.error || !program) {
    const notFound = toApiError(form.error).status === 404;
    return (
      <main className="cj-page cj-center">
        <Icon name="alert" size={28} />
        <h1 className="cj-title-small">{notFound ? "Este formulario ya no está disponible" : "No pudimos cargar el formulario"}</h1>
        <p>{notFound ? "Pide en el local un QR actualizado." : "Revisa tu conexión e inténtalo otra vez."}</p>
        {!notFound && <button type="button" className="cj-submit cj-submit-inline" onClick={form.reload}>Reintentar</button>}
      </main>
    );
  }

  const typeLabel = CARD_TYPE_CONFIG[program.tipo]?.label || "Tarjeta";
  const currentYear = new Date().getFullYear();

  return (
    <main className="cj-page">
      <header className="cj-top">
        <span className="cj-logo">{program.imagen ? <img src={program.imagen} alt="" /> : (program.negocio || "F").trim()[0].toUpperCase()}</span>
        <div>
          <strong>{program.negocio}</strong>
          <small>Tarjeta digital · {typeLabel}</small>
        </div>
      </header>

      {issued?.card ? (
        <div className="cj-shell cj-shell-done">
          <IssuedCard program={program} issued={issued} onReset={reset} />
        </div>
      ) : (
        <div className="cj-shell">
          <section className="cj-intro" aria-labelledby="cj-title">
            <h1 id="cj-title">Crea tu tarjeta de <span>{program.nombre}</span></h1>
            <p>{program.descripcion || `Únete al club de ${program.negocio} y empieza a ganar beneficios desde tu primera compra.`}</p>
            <div className="cj-preview" aria-hidden="true">
              <CardFront card={program} size="md" client={previewName(values.firstName, values.lastName)} compact />
            </div>
            <p className="cj-preview-note">Tu tarjeta empieza en 0 y suma con cada compra.</p>
          </section>

          <form className="cj-form" onSubmit={submit} noValidate aria-labelledby="cj-title">
            {!form.data.activa && (
              <p className="cj-paused" role="status"><Icon name="alert" size={16} />Esta tarjeta no está recibiendo registros por ahora.</p>
            )}
            <div className="cj-row">
              <label className="cj-field">
                <span>Nombre</span>
                <input name="firstName" autoComplete="given-name" placeholder="Ej. Valeria" maxLength={60} value={values.firstName} onChange={change} aria-invalid={errors.firstName ? "true" : undefined} aria-describedby={errors.firstName ? "cj-e-first" : undefined} />
                {errors.firstName && <small className="cj-error" id="cj-e-first">{errors.firstName}</small>}
              </label>
              <label className="cj-field">
                <span>Apellido</span>
                <input name="lastName" autoComplete="family-name" placeholder="Ej. Ramírez" maxLength={60} value={values.lastName} onChange={change} aria-invalid={errors.lastName ? "true" : undefined} aria-describedby={errors.lastName ? "cj-e-last" : undefined} />
                {errors.lastName && <small className="cj-error" id="cj-e-last">{errors.lastName}</small>}
              </label>
            </div>
            <label className="cj-field">
              <span>Correo electrónico</span>
              <input name="email" type="email" inputMode="email" autoComplete="email" placeholder="valeria@gmail.com" maxLength={160} value={values.email} onChange={change} aria-invalid={errors.email ? "true" : undefined} aria-describedby={errors.email ? "cj-e-email" : undefined} />
              {errors.email && <small className="cj-error" id="cj-e-email">{errors.email}</small>}
            </label>
            <fieldset className="cj-field cj-birth" aria-describedby={errors.birthDate ? "cj-e-birth" : undefined}>
              <legend>Fecha de nacimiento</legend>
              <div className="cj-birth-row">
                <select name="day" aria-label="Día" autoComplete="bday-day" value={values.day} onChange={change} aria-invalid={errors.birthDate ? "true" : undefined}>
                  <option value="">Día</option>
                  {Array.from({ length: 31 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}
                </select>
                <select name="month" aria-label="Mes" autoComplete="bday-month" value={values.month} onChange={change} aria-invalid={errors.birthDate ? "true" : undefined}>
                  <option value="">Mes</option>
                  {MONTHS.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
                </select>
                <select name="year" aria-label="Año" autoComplete="bday-year" value={values.year} onChange={change} aria-invalid={errors.birthDate ? "true" : undefined}>
                  <option value="">Año</option>
                  {Array.from({ length: currentYear - 1900 + 1 }, (_, index) => currentYear - index).map(year => <option key={year} value={year}>{year}</option>)}
                </select>
              </div>
              {errors.birthDate ? <small className="cj-error" id="cj-e-birth">{errors.birthDate}</small> : <small className="cj-hint">Para enviarte un detalle en tu cumpleaños.</small>}
            </fieldset>

            <label className="cj-check">
              <input type="checkbox" name="marketingConsent" checked={values.marketingConsent} onChange={change} />
              <span>Acepto recibir promociones y ofertas de <strong>{program.negocio}</strong> en mi correo y en mi tarjeta de Google Wallet. <em>(opcional)</em></span>
            </label>

            {serverError && <p className="cj-server-error" role="alert">{serverError}</p>}
            <button type="submit" className="cj-submit" disabled={sending || !form.data.activa}>
              {sending ? <Spinner /> : <Icon name="card" size={19} />}
              {sending ? "Creando tu tarjeta…" : "Crear mi tarjeta"}
            </button>
            <p className="cj-legal">
              Al crear tu tarjeta aceptas los <Link to="/terminos" target="_blank">Términos y condiciones</Link> y el <Link to="/privacidad" target="_blank">Aviso de privacidad</Link>.
            </p>
          </form>
        </div>
      )}
      <footer className="cj-footer">Tarjeta digital con <strong>Fidegresa</strong></footer>
    </main>
  );
}
