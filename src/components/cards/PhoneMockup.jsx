import PropTypes from "prop-types";
import { CardFront } from "./CardFront";

export function PhoneMockup({ card }) {
  return (
    <div className="phone-mockup-wrap">
      <div className="phone-mockup" aria-label="Vista ilustrativa de la tarjeta en el celular del cliente">
        <span className="phone-speaker" aria-hidden="true" />
        <div className="phone-screen">
          <div className="phone-status"><span>9:41</span><span>● ● ●</span></div>
          <div className="phone-app-heading"><span>Mis beneficios</span><span>•••</span></div>
          <CardFront card={card} size="sm" />
          <p>Tu próxima visita te acerca a una recompensa.</p>
          <button type="button" className="phone-wallet-button" disabled>Agregar a Wallet · demo</button>
        </div>
      </div>
      <div className="wallet-previews" aria-label="Vistas ilustrativas de billeteras digitales">
        <span><b className="wallet-apple">●</b> Apple Wallet <small>Ilustrativo</small></span>
        <span><b className="wallet-google">G</b> Google Wallet <small>Ilustrativo</small></span>
      </div>
    </div>
  );
}

PhoneMockup.propTypes = { card: PropTypes.object.isRequired };
