import PropTypes from "prop-types";

const CARD_SHAPE = PropTypes.shape({
  nombre: PropTypes.string,
  negocio: PropTypes.string,
  vigenciaMeses: PropTypes.number,
  terminos: PropTypes.string,
  colores: PropTypes.shape({ primario: PropTypes.string, acento: PropTypes.string }),
  color: PropTypes.string,
  colorAcento: PropTypes.string
});

const QR_PATTERN = [
  "11111010111",
  "10001010001",
  "10101011101",
  "10001000101",
  "11111010111",
  "00000101000",
  "11010110111",
  "10010000101",
  "11101110101",
  "10001010001",
  "11111011111"
];

export function CardBack({ card, clientCode = "FIDE-00482" }) {
  const primary = card.colores?.primario || card.color || "#603f2a";
  const accent = card.colores?.acento || card.colorAcento || "#c8894f";
  return (
    <div className="card-back" style={{ "--card-primary": primary, "--card-accent": accent }}>
      <div className="card-back-head"><span>{card.negocio || "Tu negocio"}</span><small>REVERSO DE DEMOSTRACIÓN</small></div>
      <div className="card-back-code">
        <div className="demo-qr" role="img" aria-label="Código QR decorativo de demostración, no escaneable">
          {QR_PATTERN.flatMap((row, y) => [...row].map((cell, x) => cell === "1" ? <i key={`${x}-${y}`} style={{ gridColumn: x + 1, gridRow: y + 1 }} /> : null))}
          <span>DEMO</span>
        </div>
        <div><small>CÓDIGO DEL CLIENTE</small><strong>{clientCode}</strong><p>Este QR es ilustrativo y no puede escanearse.</p></div>
      </div>
      <div className="card-back-terms">
        <span>Vigencia: {card.vigenciaMeses || 12} meses</span>
        <p>{card.terminos || "Consulta las condiciones de uso en el local."}</p>
      </div>
    </div>
  );
}

CardBack.propTypes = {
  card: CARD_SHAPE.isRequired,
  clientCode: PropTypes.string
};
