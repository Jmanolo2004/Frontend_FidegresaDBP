import { useState } from "react";
import PropTypes from "prop-types";
import { FormField } from "../common/FormField";
import { Icon } from "../common/Icon";
import { Modal } from "../common/Modal";
import { walletService } from "../../services/walletService";
import { customerService } from "../../services/customerService";
import { buildWalletPass, walletFields } from "./walletPass";

/**
 * Registra un cliente de prueba en el local del programa: el backend le entrega sus tarjetas con un QR real.
 * Ese QR va en el pase de Google Wallet, así la app de caja lo reconoce y suma estampillas, saldo o puntos.
 */
async function issueRealCard(card, name) {
  const email = `prueba.${Date.now()}@fidegresa.app`;
  const customer = await customerService.create({ fullName: name, email, localId: card.ubicacionId });
  const detail = await customerService.getById(customer.id);
  const issued = (detail.tarjetas || []).find(item => item.programaId === card.id);
  if (!issued?.qrToken) throw new Error("No pudimos emitir la tarjeta en el backend. Revisa que el programa esté activo en su local.");
  return issued;
}

/** Crea una tarjeta de prueba en Google Wallet con los colores y datos de este programa. */
export function GoogleWalletDialog({ open, card, detail, onClose }) {
  const [client, setClient] = useState("Cliente de prueba");
  const [saveUrl, setSaveUrl] = useState(null);
  const [issuedCode, setIssuedCode] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const close = () => {
    setSaveUrl(null);
    setIssuedCode(null);
    setError(null);
    onClose();
  };

  const generate = async () => {
    const name = client.trim();
    if (name.length < 2) {
      setError("Escribe el nombre que aparecerá en la tarjeta.");
      return;
    }
    if (card.estado !== "Activa") {
      setError("Activa esta tarjeta para poder emitirla: solo los programas activos entregan tarjetas.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const issued = await issueRealCard(card, name);
      setIssuedCode(issued.qrToken.replace(/^FDG-/, ""));
      setSaveUrl(await walletService.createGoogleWalletLink(buildWalletPass(card, { client: name, detail, issued })));
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
          {issuedCode ? <p>Código registrado en el sistema: <strong>{issuedCode}</strong>. Empieza en cero y se actualiza con cada escaneo en caja.</p> : null}
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
