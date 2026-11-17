import { useState } from "react";
import PropTypes from "prop-types";
import { FormField } from "../common/FormField";
import { Icon } from "../common/Icon";
import { Modal } from "../common/Modal";
import { walletService } from "../../services/walletService";
import { buildWalletPass, walletFields } from "./walletPass";

/** Crea una tarjeta de prueba en Google Wallet con los colores y datos de este programa. */
export function GoogleWalletDialog({ open, card, detail, onClose }) {
  const [client, setClient] = useState("Cliente de prueba");
  const [saveUrl, setSaveUrl] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const close = () => {
    setSaveUrl(null);
    setError(null);
    onClose();
  };

  const generate = async () => {
    const name = client.trim();
    if (name.length < 2) {
      setError("Escribe el nombre que aparecerá en la tarjeta.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      setSaveUrl(await walletService.createGoogleWalletLink(buildWalletPass(card, { client: name, detail })));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Agregar a Google Wallet"
      subtitle="Tarjeta de prueba: solo pueden guardarla las cuentas de Google con acceso a la consola de Wallet."
      onClose={close}
      onSubmit={saveUrl ? close : generate}
      submitLabel={saveUrl ? "Listo" : "Crear tarjeta"}
      submitting={submitting}
      hideCancel={Boolean(saveUrl)}
    >
      {saveUrl ? (
        <div className="wallet-ready">
          <p>La tarjeta está lista. Ábrela con la cuenta de Google de tu celular y pulsa <strong>Guardar</strong>.</p>
          <a className="google-wallet-button" href={saveUrl} target="_blank" rel="noreferrer">
            <Icon name="card" size={18} />
            <span>Agregar a Google Wallet</span>
          </a>
          <small>Si la abres en la computadora, la tarjeta aparece en el Wallet del celular con la misma cuenta.</small>
        </div>
      ) : (
        <div className="wallet-form">
          <FormField label="Nombre del cliente" error={error} hint="Así aparecerá en la tarjeta.">
            <input value={client} maxLength={40} onChange={event => setClient(event.target.value)} autoComplete="off" />
          </FormField>
          <dl className="wallet-preview" style={{ "--wallet-bg": card.colores?.primario || card.color || "#603f2a" }}>
            <div><dt>Negocio</dt><dd>{card.negocio}</dd></div>
            {walletFields(card).map(field => <div key={field.etiqueta}><dt>{field.etiqueta}</dt><dd>{field.valor}</dd></div>)}
          </dl>
        </div>
      )}
    </Modal>
  );
}

GoogleWalletDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  card: PropTypes.object.isRequired,
  detail: PropTypes.string,
  onClose: PropTypes.func.isRequired
};
