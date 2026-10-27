import PropTypes from "prop-types";
import { Icon } from "../common/Icon";

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const IMAGE_DATA = /^data:image\/(?:png|jpeg|webp);base64,/i;
const LEVEL_NAMES = ["BRONCE", "PLATA", "ORO", "DIAMANTE"];

function RewardProgress({ card }) {
  if (card.mostrarProgreso === false) return null;
  if (card.tipo === "Cashback") {
    return (
      <div className="loyalty-reward-value">
        <strong>{Number(card.porcentaje) || 5}%</strong>
        <span>cashback en compras</span>
      </div>
    );
  }
  if (card.tipo === "Niveles") {
    const levels = LEVEL_NAMES.slice(0, Math.max(3, Math.min(4, Number(card.niveles) || 3)));
    return (
      <div className="loyalty-levels">
        {levels.map((level, index) => (
          <span key={level} className={index === 1 ? "current" : ""}>
            <i>{index + 1}</i>
            {level}
          </span>
        ))}
      </div>
    );
  }
  if (card.tipo === "Giftcard") {
    return (
      <div className="loyalty-reward-value gift-balance">
        <strong>S/ {Number(card.saldo) || 100}</strong>
        <span>saldo de regalo</span>
      </div>
    );
  }
  const total = Math.max(2, Math.min(12, Number(card.estampillas) || 10));
  return (
    <div className="loyalty-progress-stamps" aria-label={`${total} espacios para visitas`}>
      {Array.from({ length: total }, (_, index) => (
        <span key={index} className={`loyalty-stamp${index < 3 ? " collected" : ""}`}>
          {index < 3 && <Icon name="star" size={12} />}
        </span>
      ))}
    </div>
  );
}

RewardProgress.propTypes = { card: PropTypes.object.isRequired };

/** Vista de la tarjeta digital de fidelización que reemplaza a la tarjeta física. */
export function LoyaltyCard({ card }) {
  const primary = HEX_COLOR.test(card.color || "") ? card.color : "#603f2a";
  const accent = HEX_COLOR.test(card.colorAcento || "") ? card.colorAcento : "#c8894f";
  const image = typeof card.imagen === "string" && IMAGE_DATA.test(card.imagen) ? card.imagen : null;
  const businessName = card.negocio || "Tu negocio";
  const monogram = <span className="loyalty-monogram">{businessName.trim().slice(0, 1).toUpperCase()}</span>;

  return (
    <article className={`loyalty-card-visual style-${card.estilo || "elegante"}`} style={{ "--loyalty-primary": primary, "--loyalty-accent": accent }}>
      {image && (
        <div className="loyalty-artwork-wrap">
          <img className="loyalty-artwork" src={image} alt="" />
        </div>
      )}
      <div className="loyalty-card-top">
        {!image && monogram}
        <span className="loyalty-brand-name">{businessName}</span>
        <span className="loyalty-program-type">{card.tipo || "Estampillas"}</span>
      </div>
      <div className="loyalty-card-copy">
        <h3>{card.nombre || "Nombre de tu programa"}</h3>
        <p>{card.descripcion || "Tu beneficio aparecerá aquí"}</p>
      </div>
      <RewardProgress card={card} />
      <div className="loyalty-card-bottom">
        <span>
          <small>BENEFICIO</small>
          <strong>{card.premio || card.descripcion || "Tu recompensa"}</strong>
        </span>
        {card.mostrarQr !== false && (
          <span className="loyalty-demo-code" aria-label="Código decorativo no escaneable">
            <i />
            <b>DEMO</b>
          </span>
        )}
      </div>
    </article>
  );
}

LoyaltyCard.propTypes = {
  card: PropTypes.shape({
    nombre: PropTypes.string,
    tipo: PropTypes.string,
    negocio: PropTypes.string,
    descripcion: PropTypes.string,
    premio: PropTypes.string,
    color: PropTypes.string,
    colorAcento: PropTypes.string,
    estilo: PropTypes.string,
    imagen: PropTypes.string,
    estampillas: PropTypes.number,
    porcentaje: PropTypes.number,
    niveles: PropTypes.number,
    saldo: PropTypes.number,
    mostrarProgreso: PropTypes.bool,
    mostrarQr: PropTypes.bool
  }).isRequired
};
