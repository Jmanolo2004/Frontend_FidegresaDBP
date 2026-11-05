import { useState } from "react";
import PropTypes from "prop-types";
import { CardBack } from "./CardBack";
import { CardFront } from "./CardFront";

export function CardFlip({ card, size = "lg", initialSide = "front" }) {
  const [flipped, setFlipped] = useState(initialSide === "back");
  return (
    <button
      type="button"
      className={`card-flip card-flip-${size}${flipped ? " is-flipped" : ""}`}
      onClick={() => setFlipped(value => !value)}
      aria-pressed={flipped}
      aria-label={flipped ? "Mostrar frente de la tarjeta" : "Mostrar reverso de la tarjeta con QR"}
    >
      <span className="card-flip-inner">
        <span className="card-flip-face"><CardFront card={card} size={size} /></span>
        <span className="card-flip-face card-flip-back"><CardBack card={card} /></span>
      </span>
      <span className="card-flip-hint" aria-hidden="true">{flipped ? "Volver al frente" : "Girar para ver QR y términos"}</span>
    </button>
  );
}

CardFlip.propTypes = {
  card: PropTypes.object.isRequired,
  size: PropTypes.oneOf(["sm", "md", "lg"]),
  initialSide: PropTypes.oneOf(["front", "back"])
};
