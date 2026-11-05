import PropTypes from "prop-types";
import { SampleCode } from "./SampleCode";
import { StampMark } from "./StampMark";

const STAMP_GOAL = 10;
const TILTS = [-9, 6, -3, 11, -7, 4, -12, 8, -4, 10];

/** Celular con la tarjeta digital. Los sellos reciben su valor desde la sección que lo muestra. */
export function PhoneCard({ stamps, className = "" }) {
  const collected = Math.min(STAMP_GOAL, Math.max(0, stamps));
  const rewardReady = collected === STAMP_GOAL;

  return (
    <div className={`phone ${className}`}>
      <div className="phone-screen">
        <span className="phone-notch" aria-hidden="true" />
        <div className={`wallet-card${rewardReady ? " is-complete" : ""}`}>
          <div className="wallet-head">
            <strong>Café de la Plaza</strong>
            <span>Lucía M.</span>
          </div>
          <p className="wallet-title">{rewardReady ? "Tu café va por la casa" : "Tu décimo café va por la casa"}</p>
          <div className="stamp-grid" role="img" aria-label={`${collected} de ${STAMP_GOAL} sellos`}>
            {Array.from({ length: STAMP_GOAL }, (_, index) => (
              <span className="stamp-slot" key={index}>
                {index < collected && (
                  <span className="stamp-pressed" style={{ "--tilt": `${TILTS[index]}deg` }}>
                    <StampMark />
                  </span>
                )}
              </span>
            ))}
          </div>
          <p className="wallet-count">{rewardReady ? "Premio listo para canjear" : `${collected} de ${STAMP_GOAL} visitas`}</p>
        </div>
        <div className="phone-code">
          <SampleCode />
          <span>Muéstralo en caja</span>
        </div>
      </div>
    </div>
  );
}

PhoneCard.propTypes = { stamps: PropTypes.number.isRequired, className: PropTypes.string };
