import PropTypes from "prop-types";
import { Icon } from "../common/Icon";
import { createDefaultRules } from "../cards/cardTypes";
import { formatMoney } from "../../utils/format";

const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;
const clamp = value => Math.max(0, Math.min(100, value));

/** Barra de avance con texto accesible. */
function Bar({ percent, label, color }) {
  return (
    <div className="cp-bar" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)}>
      <span style={{ width: `${clamp(percent)}%`, background: color }} />
    </div>
  );
}

Bar.propTypes = { percent: PropTypes.number.isRequired, label: PropTypes.string.isRequired, color: PropTypes.string };

function Stamps({ card, rules, color }) {
  const goal = Math.max(1, Number(rules.sellosMeta) || 10);
  const stamps = Math.min(goal, Math.max(0, Number(card.estampillas) || 0));
  const missing = goal - stamps;
  return (
    <>
      <div className="cp-stamps" role="img" aria-label={`${stamps} de ${goal} sellos`}>
        {Array.from({ length: goal }, (_, index) => (
          <span key={index} className={index < stamps ? "is-on" : undefined} style={index < stamps ? { background: color, borderColor: color } : undefined}>
            {index < stamps && <Icon name="star" size={12} />}
          </span>
        ))}
      </div>
      <p className="cp-text">
        {missing === 0 ? (
          <><strong>¡Completó su tarjeta!</strong> Ya puede canjear {rules.premio ? `“${rules.premio}”` : "su premio"}.</>
        ) : (
          <><strong>Le {missing === 1 ? "falta 1 sello" : `faltan ${missing} sellos`}</strong> para {rules.premio ? `“${rules.premio}”` : "su premio"}.</>
        )}
      </p>
    </>
  );
}

function Cashback({ card, rules, color }) {
  const balance = Number(card.saldoCashback) || 0;
  const minimum = Number(rules.saldoMinimoCanje) || 0;
  return (
    <>
      <p className="cp-amount">{formatMoney(balance)}<small> de saldo</small></p>
      {minimum > 0 && <Bar percent={(balance / minimum) * 100} color={color} label={`Saldo para poder canjear: ${formatMoney(balance)} de ${formatMoney(minimum)}`} />}
      <p className="cp-text">
        {balance >= minimum ? (
          <><strong>Ya puede usar su saldo</strong> en su próxima compra.</>
        ) : (
          <><strong>Le faltan {formatMoney(minimum - balance)}</strong> para poder usar su saldo (mínimo {formatMoney(minimum)}).</>
        )}
        {rules.porcentaje ? ` Gana ${rules.porcentaje} % de cada compra.` : ""}
      </p>
    </>
  );
}

function Tiers({ card, rules }) {
  const points = Math.max(0, Number(card.puntos) || 0);
  const levels = [...(rules.niveles || [])].sort((a, b) => a.desdePuntos - b.desdePuntos);
  if (!levels.length) return <p className="cp-text"><strong>{plural(points, "punto", "puntos")}</strong> acumulados.</p>;
  const currentIndex = Math.max(0, levels.findLastIndex(level => points >= level.desdePuntos));
  const current = levels[currentIndex];
  const next = levels[currentIndex + 1];
  const percent = next ? ((points - current.desdePuntos) / (next.desdePuntos - current.desdePuntos)) * 100 : 100;
  return (
    <>
      <ol className="cp-tiers" aria-label="Niveles del programa">
        {levels.map((level, index) => (
          <li key={level.nombre} className={index === currentIndex ? "is-current" : index < currentIndex ? "is-done" : undefined} style={{ "--tier": level.color || "#b8794f" }}>
            {level.nombre}
          </li>
        ))}
      </ol>
      <Bar percent={percent} color={current.color} label={next ? `Avance hacia ${next.nombre}` : "Nivel más alto"} />
      <p className="cp-text">
        Está en <strong>{current.nombre}</strong> con {plural(points, "punto", "puntos")}.{" "}
        {next ? (
          <>Le {next.desdePuntos - points === 1 ? "falta 1 punto" : `faltan ${next.desdePuntos - points} puntos`} para {next.nombre}{next.beneficio ? `: ${next.beneficio.charAt(0).toLowerCase()}${next.beneficio.slice(1)}` : ""}.</>
        ) : (
          "Ya llegó al nivel más alto."
        )}
      </p>
    </>
  );
}

function Gift({ card }) {
  const balance = Number(card.saldoGiftcard) || 0;
  return (
    <>
      <p className="cp-amount">{formatMoney(balance)}<small> disponibles</small></p>
      <p className="cp-text">{balance > 0 ? "Puede usarlo en cualquier compra del local." : "Ya usó todo el saldo de su gift card."}</p>
    </>
  );
}

const BODIES = { Estampillas: Stamps, Cashback, Niveles: Tiers, Giftcard: Gift };

/** Las tarjetas del cliente: la del programa principal y, si el backend las envía, todas las demás con su saldo. */
export function customerCards(customer) {
  if (customer.tarjetas?.length) return customer.tarjetas;
  const program = customer.tarjetaPrograma;
  if (!program) return [];
  return [{
    id: "principal",
    estado: "ACTIVE",
    programaId: program.id,
    programa: program.nombre,
    tipo: program.tipo,
    estampillas: customer.estampillas,
    saldoCashback: customer.saldoCashback,
    puntos: customer.puntos,
    saldoGiftcard: customer.saldoGiftcard
  }];
}

/** Progreso del cliente en cada tarjeta: sellos, saldo, nivel o gift card. */
export function CardProgress({ customer, programs }) {
  const cards = customerCards(customer);
  if (!cards.length) return null;
  const programOf = card =>
    programs?.find(program => Number(program.id) === Number(card.programaId)) ||
    (Number(customer.tarjetaPrograma?.id) === Number(card.programaId) ? customer.tarjetaPrograma : null);

  return (
    <ul className="cp-list">
      {cards.map(card => {
        const program = programOf(card);
        const rules = { ...createDefaultRules(card.tipo), ...(program?.reglas || {}) };
        const color = program?.colores?.primario || "var(--caramel)";
        const Body = BODIES[card.tipo];
        return (
          <li key={card.id} className="cp-item">
            <div className="cp-head">
              <strong>{card.programa}</strong>
              <span className="cp-type">{card.tipo === "Giftcard" ? "Gift card" : card.tipo}</span>
              {card.estado === "BLOCKED" && <span className="cp-blocked">Bloqueada</span>}
            </div>
            {Body ? <Body card={card} rules={rules} color={color} /> : null}
          </li>
        );
      })}
    </ul>
  );
}

const cardShape = PropTypes.shape({ id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]), tipo: PropTypes.string });
Stamps.propTypes = { card: cardShape.isRequired, rules: PropTypes.object.isRequired, color: PropTypes.string };
Cashback.propTypes = Stamps.propTypes;
Tiers.propTypes = { card: cardShape.isRequired, rules: PropTypes.object.isRequired };
Gift.propTypes = { card: cardShape.isRequired };
CardProgress.propTypes = { customer: PropTypes.object.isRequired, programs: PropTypes.array };
