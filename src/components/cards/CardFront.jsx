import PropTypes from "prop-types";
import qrImage from "../../assets/illustrative-qr.png";
import { Icon } from "../common/Icon";
import { QrCode } from "../common/QrCode";
import { CARD_TYPE_CONFIG } from "./cardTypes";
import { passStyle } from "./passTheme";

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
  portada: PropTypes.string,
  reglas: PropTypes.object
});

// Las vistas previas muestran la tarjeta como recién creada (todo en 0); el detalle de un cliente pasa sus datos reales.
const SAMPLE = { stamps: 0, client: "Tu cliente", balance: 0, points: 0 };

const DEFAULT_LEVELS = [
  { nombre: "Bronce", desdePuntos: 0 },
  { nombre: "Plata", desdePuntos: 100 },
  { nombre: "Oro", desdePuntos: 300 }
];

function formatSoles(value) {
  return `S/ ${(Number(value) || 0).toFixed(2)}`;
}

function PassLogo({ card }) {
  return (
    <span className="pass-logo">
      {card.imagen ? <img src={card.imagen} alt="" /> : <b>{(card.negocio || "F").trim().slice(0, 1).toUpperCase()}</b>}
    </span>
  );
}

PassLogo.propTypes = { card: CARD_SHAPE.isRequired };

function PassField({ label, value, align = "start" }) {
  return (
    <div className={`pass-field pass-field-${align}`}>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

PassField.propTypes = { label: PropTypes.string.isRequired, value: PropTypes.node.isRequired, align: PropTypes.oneOf(["start", "end"]) };

function PassStrip({ card, children }) {
  const icon = CARD_TYPE_CONFIG[card.tipo]?.icon || "star";
  return (
    <div className={`pass-strip${card.portada ? "" : " pass-strip-empty"}`}>
      {card.portada ? <img src={card.portada} alt="" /> : <Icon name={icon} size={64} className="pass-strip-watermark" />}
      {children}
    </div>
  );
}

PassStrip.propTypes = { card: CARD_SHAPE.isRequired, children: PropTypes.node };

/** Con value dibuja el QR real de la tarjeta (el que escanea la caja); sin value, uno ilustrativo. */
function PassQr({ value }) {
  return (
    <div className="pass-qr">
      {value ? <QrCode value={value} size={132} label="Código QR de tu tarjeta" margin={1} /> : <img src={qrImage} alt="Código QR ilustrativo de la tarjeta" />}
      <span>{value ? value.replace(/^FDG-/, "") : "Fidegresa"}</span>
    </div>
  );
}

PassQr.propTypes = { value: PropTypes.string };

function StampPass({ card, stamps, client }) {
  const goal = Math.max(1, Number(card.reglas?.sellosMeta || card.estampillas || 10));
  const filled = Math.min(goal, Math.max(0, Number(stamps ?? SAMPLE.stamps) || 0));
  const columns = goal <= 10 ? 5 : 6;
  return (
    <>
      <div className="pass-header">
        <PassLogo card={card} />
        <span className="pass-business">{card.negocio || "Tu negocio"}</span>
        <PassField label="CLIENTE" value={client} align="end" />
      </div>
      <PassStrip card={card}>
        <div className="pass-stamps" style={{ "--stamp-columns": columns }} role="img" aria-label={`${filled} de ${goal} sellos`}>
          {Array.from({ length: goal }, (_, index) => (
            <span key={index} className={index < filled ? "filled" : ""}>
              <Icon name={card.reglas?.iconoSello || "star"} size={18} />
            </span>
          ))}
        </div>
      </PassStrip>
      <div className="pass-fields">
        <PassField label="Estampillas totales" value={goal} />
        <PassField label="Estampillas completadas" value={filled} align="end" />
      </div>
    </>
  );
}

StampPass.propTypes = { card: CARD_SHAPE.isRequired, stamps: PropTypes.number, client: PropTypes.string.isRequired };

function TierPass({ card, client, points }) {
  const levels = (card.reglas?.niveles?.length ? card.reglas.niveles : DEFAULT_LEVELS).slice(0, 5);
  const score = Number(points ?? SAMPLE.points) || 0;
  const currentIndex = levels.reduce((found, level, index) => (score >= Number(level.desdePuntos || 0) ? index : found), 0);
  const current = levels[currentIndex];
  return (
    <>
      <div className="pass-header">
        <PassLogo card={card} />
        <span className="pass-business">{card.negocio || "Tu negocio"}</span>
      </div>
      <PassStrip card={card}>
        <div className="pass-tiers" role="img" aria-label={`Nivel ${currentIndex + 1} de ${levels.length}: ${current?.nombre}`}>
          {levels.map((level, index) => (
            <span
              key={`${level.nombre}-${index}`}
              className={index === currentIndex ? "current" : index < currentIndex ? "reached" : ""}
              style={{ "--tier-height": `${34 + (index * 58) / Math.max(1, levels.length - 1)}%` }}
              title={level.nombre}
            >
              {index + 1}
            </span>
          ))}
        </div>
      </PassStrip>
      <div className="pass-fields">
        <PassField label="NIVEL REGISTRADO" value={current?.nombre || `Nivel ${currentIndex + 1}`} />
        <PassField label="NOMBRE" value={client} align="end" />
      </div>
    </>
  );
}

TierPass.propTypes = { card: CARD_SHAPE.isRequired, client: PropTypes.string.isRequired, points: PropTypes.number };

function GiftPass({ card, client, balance }) {
  const amount = balance ?? SAMPLE.balance;
  return (
    <>
      <div className="pass-header">
        <PassLogo card={card} />
        <span className="pass-business">{card.negocio || "Tu negocio"}</span>
      </div>
      <PassStrip card={card} />
      <div className="pass-fields">
        <PassField label="SALDO DISPONIBLE" value={formatSoles(amount)} />
        <PassField label="CLIENTE" value={client} align="end" />
      </div>
    </>
  );
}

GiftPass.propTypes = { card: CARD_SHAPE.isRequired, client: PropTypes.string.isRequired, balance: PropTypes.number };

function CashbackPass({ card, client, balance }) {
  const rate = card.reglas?.porcentaje || card.porcentaje || 5;
  return (
    <>
      <div className="pass-header pass-header-divided">
        <PassLogo card={card} />
        <span className="pass-business pass-business-strong">{card.negocio || "Tu negocio"}</span>
      </div>
      <div className="pass-cashback-body">
        <h3>{card.nombre || card.negocio || "Cashback"}</h3>
        <div className="pass-fields pass-fields-tight">
          <PassField label="SALDO" value={formatSoles(balance ?? SAMPLE.balance)} />
          <PassField label="CASHBACK" value={`${rate}%`} align="end" />
        </div>
        <PassField label="NOMBRE DEL CLIENTE" value={client} />
      </div>
    </>
  );
}

CashbackPass.propTypes = { card: CARD_SHAPE.isRequired, client: PropTypes.string.isRequired, balance: PropTypes.number };

export function CardFront({ card, size = "md", stamps, client, balance, points, qrValue, compact = false }) {
  const typeLabel = CARD_TYPE_CONFIG[card.tipo]?.label || "Tarjeta de fidelización";
  const clientName = client || SAMPLE.client;
  const type = card.tipo || "Estampillas";
  const isCashback = type === "Cashback";
  let body;
  if (isCashback) body = <CashbackPass card={card} client={clientName} balance={balance} />;
  else if (type === "Niveles") body = <TierPass card={card} client={clientName} points={points} />;
  else if (type === "Giftcard") body = <GiftPass card={card} client={clientName} balance={balance} />;
  else body = <StampPass card={card} stamps={stamps} client={clientName} />;

  return (
    <div
      className={`wallet-pass wallet-pass-${size} wallet-pass-${type.toLowerCase()} style-${card.estilo || "elegante"}${compact ? " is-compact" : ""}`}
      style={passStyle(card)}
      aria-label={`${card.nombre || typeLabel}, ${typeLabel}`}
    >
      <div className="wallet-pass-inner">
        {body}
        {!compact && <PassQr value={qrValue} />}
        {isCashback && <PassStrip card={card} />}
      </div>
    </div>
  );
}

CardFront.propTypes = {
  card: CARD_SHAPE.isRequired,
  size: PropTypes.oneOf(["sm", "md", "lg"]),
  stamps: PropTypes.number,
  client: PropTypes.string,
  balance: PropTypes.number,
  points: PropTypes.number,
  qrValue: PropTypes.string,
  compact: PropTypes.bool
};
