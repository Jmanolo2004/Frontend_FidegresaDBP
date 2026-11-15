import PropTypes from "prop-types";
import { passStyle } from "./passTheme";

const CARD_SHAPE = PropTypes.shape({
  nombre: PropTypes.string,
  negocio: PropTypes.string,
  descripcion: PropTypes.string,
  vigenciaMeses: PropTypes.number,
  terminos: PropTypes.string,
  colores: PropTypes.shape({ primario: PropTypes.string, acento: PropTypes.string }),
  color: PropTypes.string,
  colorAcento: PropTypes.string
});

/** Reverso de la tarjeta: como en Wallet, muestra los datos y condiciones del programa. */
export function CardBack({ card, clientCode = "FIDE-00482" }) {
  return (
    <div className="wallet-pass wallet-pass-back" style={passStyle(card)}>
      <div className="wallet-pass-inner pass-back">
        <div className="pass-back-head">
          <strong>{card.negocio || "Tu negocio"}</strong>
          <small>Detalles de la tarjeta</small>
        </div>
        <dl className="pass-back-list">
          <div><dt>Programa</dt><dd>{card.nombre || "Tu programa"}</dd></div>
          {card.descripcion && <div><dt>Beneficio</dt><dd>{card.descripcion}</dd></div>}
          <div><dt>Código del cliente</dt><dd>{clientCode}</dd></div>
          <div><dt>Vigencia</dt><dd>{card.vigenciaMeses || 12} meses</dd></div>
          <div><dt>Términos y condiciones</dt><dd>{card.terminos || "Consulta las condiciones de uso en el local."}</dd></div>
        </dl>
        <p className="pass-back-foot">Tarjeta digital emitida con Fidegresa</p>
      </div>
    </div>
  );
}

CardBack.propTypes = {
  card: CARD_SHAPE.isRequired,
  clientCode: PropTypes.string
};
