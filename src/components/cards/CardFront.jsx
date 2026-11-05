import PropTypes from "prop-types";
import { Icon } from "../common/Icon";
import { CARD_TYPE_CONFIG } from "./cardTypes";

const CARD_SHAPE = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  nombre: PropTypes.string,
  tipo: PropTypes.string,
  negocio: PropTypes.string,
  descripcion: PropTypes.string,
  colores: PropTypes.shape({ primario: PropTypes.string, acento: PropTypes.string }),
  color: PropTypes.string,
  colorAcento: PropTypes.string,
  estilo: PropTypes.string,
  imagen: PropTypes.string,
  reglas: PropTypes.object
});

function cardStyle(card) {
  return {
    "--card-primary": card.colores?.primario || card.color || "#603f2a",
    "--card-accent": card.colores?.acento || card.colorAcento || "#c8894f"
  };
}

function StampCardFront({ card }) {
  const goal = Number(card.reglas?.sellosMeta || card.estampillas || 10);
  const filled = Math.min(goal, 6);
  return (
    <div className="card-front-stamps" aria-label={`${filled} de ${goal} sellos`}>
      <div className="card-front-brand">
        <span className="card-front-mark">{card.imagen ? <img src={card.imagen} alt="" /> : card.negocio?.slice(0, 1) || "F"}</span>
        <span>{card.negocio || "Tu negocio"}</span>
        <Icon name="star" size={16} />
      </div>
      <div className="card-front-copy">
        <span className="card-front-eyebrow">TU TARJETA DE VISITAS</span>
        <h3>{card.nombre || "Tarjeta de estampillas"}</h3>
        <p>{card.descripcion || "Cada visita te acerca a una recompensa."}</p>
      </div>
      <div className="stamp-grid" aria-hidden="true">
        {Array.from({ length: goal }, (_, index) => (
          <span key={index} className={index < filled ? "filled" : ""}>
            {index < filled && <Icon name={card.reglas?.iconoSello || "star"} size={12} />}
          </span>
        ))}
      </div>
      <div className="card-front-bottom">
        <strong>{filled} / {goal}</strong>
        <span>{card.reglas?.premio || card.premio || "Tu próxima recompensa"}</span>
      </div>
    </div>
  );
}

function CashbackCardFront({ card }) {
  return (
    <div className="card-front-cashback">
      <div className="card-cashback-shine" aria-hidden="true" />
      <div className="card-front-brand">
        <span className="card-front-mark">{card.imagen ? <img src={card.imagen} alt="" /> : card.negocio?.slice(0, 1) || "F"}</span>
        <span>{card.negocio || "Tu negocio"}</span>
        <span className="card-chip" aria-hidden="true" />
      </div>
      <div className="card-front-copy">
        <span className="card-front-eyebrow">CASHBACK EN TUS COMPRAS</span>
        <strong className="cashback-rate">{card.reglas?.porcentaje || card.porcentaje || 5}<span>%</span></strong>
        <p>{card.descripcion || "Recibe saldo con cada compra."}</p>
      </div>
      <div className="card-front-bottom">
        <span>Saldo disponible</span>
        <strong>S/ 24.50</strong>
      </div>
    </div>
  );
}

function TierCardFront({ card }) {
  const levels = card.reglas?.niveles || [
    { nombre: "Bronce", desdePuntos: 0, beneficio: "Acceso al programa", color: "#b8794f" },
    { nombre: "Plata", desdePuntos: 100, beneficio: "5% de descuento", color: "#9da5ad" },
    { nombre: "Oro", desdePuntos: 300, beneficio: "Bebida de cortesía", color: "#d4a84e" }
  ];
  const currentLevel = levels[Math.min(1, levels.length - 1)];
  const nextLevel = levels[Math.min(2, levels.length - 1)];
  const progress = currentLevel?.desdePuntos ? Math.min(100, (180 / currentLevel.desdePuntos) * 100) : 60;
  return (
    <div className="card-front-tiers">
      <div className="card-front-brand">
        <span className="card-front-mark">{card.imagen ? <img src={card.imagen} alt="" /> : card.negocio?.slice(0, 1) || "F"}</span>
        <span>{card.negocio || "Tu negocio"}</span>
        <Icon name="users" size={16} />
      </div>
      <div className="tier-current">
        <span className="tier-medal" style={{ "--tier-color": currentLevel?.color || "var(--card-accent)" }}>
          <Icon name="star" size={23} />
        </span>
        <span><small>NIVEL ACTUAL</small><strong>{currentLevel?.nombre || "Plata"}</strong></span>
      </div>
      <div className="card-front-copy">
        <h3>{card.nombre || "Niveles de beneficios"}</h3>
        <p>{card.descripcion || currentLevel?.beneficio}</p>
      </div>
      <div className="tier-progress" aria-label={`Progreso hacia ${nextLevel?.nombre || "el siguiente nivel"}`}>
        <div><span>180 puntos</span><span>{nextLevel?.desdePuntos || 300} pts · {nextLevel?.nombre || "Oro"}</span></div>
        <span className="tier-track"><i style={{ width: `${progress}%` }} /></span>
      </div>
      <div className="tier-level-list">
        {levels.slice(0, 5).map((level, index) => <span key={`${level.nombre}-${index}`} className={index === 1 ? "current" : ""}>{level.nombre}</span>)}
      </div>
    </div>
  );
}

function GiftCardFront({ card }) {
  const amount = card.reglas?.montos?.[1] || card.saldo || 100;
  return (
    <div className="card-front-gift">
      <span className="gift-ribbon gift-ribbon-vertical" aria-hidden="true" />
      <span className="gift-ribbon gift-ribbon-horizontal" aria-hidden="true" />
      <div className="card-front-brand">
        <span className="card-front-mark">{card.imagen ? <img src={card.imagen} alt="" /> : card.negocio?.slice(0, 1) || "F"}</span>
        <span>{card.negocio || "Tu negocio"}</span>
        <Icon name="reward" size={16} />
      </div>
      <div className="gift-message">
        <span className="card-front-eyebrow">UN REGALO PARA DISFRUTAR</span>
        <h3>{card.nombre || "Gift card"}</h3>
        <strong>S/ {Number(amount).toFixed(2)}</strong>
        <p>{card.reglas?.mensajeRegalo || "Un momento especial para ti"}</p>
      </div>
      <div className="gift-to-from"><span>Para <b>Alex</b></span><span>De <b>María</b></span></div>
    </div>
  );
}

function CardContent({ card }) {
  if (card.tipo === "Cashback") return <CashbackCardFront card={card} />;
  if (card.tipo === "Niveles") return <TierCardFront card={card} />;
  if (card.tipo === "Giftcard") return <GiftCardFront card={card} />;
  return <StampCardFront card={card} />;
}

CardContent.propTypes = { card: CARD_SHAPE.isRequired };

export function CardFront({ card, size = "md" }) {
  const typeLabel = CARD_TYPE_CONFIG[card.tipo]?.label || "Tarjeta de fidelización";
  return (
    <div className={`card-front card-front-${size} card-front-type-${card.tipo?.toLowerCase() || "estampillas"} style-${card.estilo || "elegante"}`} style={cardStyle(card)} aria-label={`${card.nombre || typeLabel}, ${typeLabel}`}>
      <CardContent card={card} />
    </div>
  );
}

CardFront.propTypes = {
  card: CARD_SHAPE.isRequired,
  size: PropTypes.oneOf(["sm", "md", "lg"])
};
