import PropTypes from "prop-types";

const SAMPLE_NAME = "Valeria";

/** Reemplaza las variables como lo hará el backend al enviar, con datos de ejemplo. */
export function fillVariables(text, { branch, reward } = {}) {
  return String(text || "")
    .replaceAll("{nombre}", SAMPLE_NAME)
    .replaceAll("{local}", branch || "tu local")
    .replaceAll("{premio}", reward || "un beneficio especial");
}

/** "Sábado, 28 de noviembre": solo la primera letra en mayúscula, como en Android. */
function today() {
  const text = new Date().toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function WalletMark() {
  return (
    <span className="gw-mark" aria-hidden="true"><i /><i /><i /><i /></span>
  );
}

/**
 * Cómo llega el aviso: notificación de Google Wallet en Android y, al abrirla, el mensaje dentro de la tarjeta.
 * Se dibuja en vivo mientras el dueño escribe.
 */
export function WalletNotificationPreview({ title, message, action, branch, reward }) {
  const filledTitle = fillVariables(title, { branch, reward }).trim();
  const filledMessage = fillVariables(message, { branch, reward }).trim();
  const shownTitle = filledTitle || "Tu próxima visita tiene premio";
  const shownMessage = filledMessage || `Hola ${SAMPLE_NAME}, acércate a ${branch || "tu local"} y descubre un beneficio preparado para ti.`;
  const placeholder = !filledTitle && !filledMessage;

  return (
    <div className="gw-preview" aria-label="Vista previa del aviso en Google Wallet">
      <div className="gw-phone">
        <div className="gw-screen">
          <div className="gw-status"><span>9:41</span><span className="gw-status-icons" aria-hidden="true"><i /><i /><i /></span></div>
          <div className="gw-clock">9:41</div>
          <div className="gw-date">{today()}</div>
          <div className={`gw-notification${placeholder ? " is-placeholder" : ""}`}>
            <div className="gw-notification-head">
              <WalletMark />
              <span>Google Wallet</span>
              <i aria-hidden="true">·</i>
              <time>ahora</time>
            </div>
            <strong>{shownTitle}</strong>
            <p>{shownMessage}</p>
            {action && <span className="gw-notification-action">{action}</span>}
          </div>
          <small className="gw-hint">Toca el aviso para abrir la tarjeta</small>
        </div>
      </div>

      <div className="gw-pass-message">
        <span className="gw-pass-label"><WalletMark />Dentro de su tarjeta</span>
        <strong>{shownTitle}</strong>
        <p>{shownMessage}</p>
      </div>
      <p className="gw-note">Llega solo a quienes guardaron su tarjeta en Google Wallet. Google permite hasta 3 avisos con sonido al día por cliente.</p>
    </div>
  );
}

WalletNotificationPreview.propTypes = {
  title: PropTypes.string,
  message: PropTypes.string,
  action: PropTypes.string,
  branch: PropTypes.string,
  reward: PropTypes.string
};
