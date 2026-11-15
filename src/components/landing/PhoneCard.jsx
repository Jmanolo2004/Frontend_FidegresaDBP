import PropTypes from "prop-types";
import coverCafePlaza from "../../assets/cover-cafe-plaza.jpg";
import { CardFront } from "../cards/CardFront";

const STAMP_GOAL = 10;

// Misma tarjeta Wallet que ve el negocio en su panel, para que la landing y el producto coincidan.
const LANDING_CARD = {
  nombre: "Un café con cariño",
  tipo: "Estampillas",
  negocio: "Café de la Plaza",
  colores: { primario: "#d9a514", acento: "#a8650b" },
  estilo: "elegante",
  portada: coverCafePlaza,
  reglas: { sellosMeta: STAMP_GOAL, iconoSello: "star", premio: "Un café gratis" }
};

/** Celular con la tarjeta digital. Los sellos reciben su valor desde la sección que lo muestra. */
export function PhoneCard({ stamps, className = "" }) {
  const collected = Math.min(STAMP_GOAL, Math.max(0, stamps));
  const rewardReady = collected === STAMP_GOAL;

  return (
    <div className={`phone ${className}`}>
      <div className="phone-screen landing-phone-screen">
        <span className="phone-notch" aria-hidden="true" />
        <div className={`landing-pass${rewardReady ? " is-complete" : ""}`}>
          <CardFront card={LANDING_CARD} size="lg" stamps={collected} client="Lucía M." />
        </div>
        <p className={`landing-pass-status${rewardReady ? " is-ready" : ""}`} aria-live="polite">
          {rewardReady ? "¡Premio listo! Un café gratis te espera" : `Te faltan ${STAMP_GOAL - collected} sellos para tu café gratis`}
        </p>
      </div>
    </div>
  );
}

PhoneCard.propTypes = { stamps: PropTypes.number.isRequired, className: PropTypes.string };
