import { useMemo } from "react";
import PropTypes from "prop-types";
import { Icon } from "../common/Icon";

const SHOWCASE_CARDS = [
  { tipo: "Estampillas", negocio: "Café de la Plaza", nombre: "Un café con cariño", detalle: "10 visitas para premiar" },
  { tipo: "Cashback", negocio: "Dulce Encuentro", nombre: "Dulce recompensa", detalle: "5% de vuelta" },
  { tipo: "Estampillas", negocio: "Barbería Norte", nombre: "Cortes que premian", detalle: "10 visitas para premiar" },
  { tipo: "Cashback", negocio: "La Mesa Alegre", nombre: "La Mesa te premia", detalle: "5% de vuelta" },
  { tipo: "Estampillas", negocio: "Confitería Nube", nombre: "Un detalle de Nube", detalle: "10 visitas para premiar" }
];

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

/** Panel derecho de las pantallas de acceso. variant="login" muestra tarjetas; "register" una cita. */
export function AuthShowcase({ variant = "login" }) {
  const cards = useMemo(() => shuffle(SHOWCASE_CARDS).slice(0, 3), []);

  if (variant === "register") {
    return (
      <aside className="auth-showcase register-showcase">
        <div className="showcase-copy">
          <span className="showcase-kicker">Bienvenido a tu comunidad</span>
          <h2>
            Tu negocio tiene
            <br />
            mucho para compartir.
          </h2>
          <p>Crea experiencias que convierten cada visita en una próxima razón para volver.</p>
        </div>
        <div className="showcase-quote">
          <img src="/favicon.svg" alt="" />
          <p>“La lealtad se construye con cada pequeño detalle.”</p>
        </div>
        <span className="showcase-decoration" aria-hidden="true" />
      </aside>
    );
  }

  return (
    <aside className="auth-showcase" aria-label="Tarjetas de fidelización">
      <div className="showcase-copy">
        <span className="showcase-kicker">Una razón más para volver</span>
        <h2>
          Pequeños momentos,
          <br />
          grandes lealtades.
        </h2>
        <p>Descubre beneficios creados para los negocios de tu comunidad.</p>
      </div>
      <div className="showcase-cards">
        {cards.map((card, index) => (
          <article key={card.nombre} className={`showcase-card showcase-card-${index + 1}${card.tipo === "Cashback" ? " cashback" : ""}`}>
            <span className="showcase-card-type">
              {card.tipo} · {card.negocio}
            </span>
            <strong>{card.nombre}</strong>
            <span className="showcase-card-reward">{card.detalle}</span>
            <span className="showcase-card-bottom">
              <Icon name={card.tipo === "Cashback" ? "reward" : "star"} size={16} /> Beneficios que te hacen volver
            </span>
          </article>
        ))}
      </div>
      <span className="showcase-decoration" aria-hidden="true" />
    </aside>
  );
}

AuthShowcase.propTypes = { variant: PropTypes.oneOf(["login", "register"]) };
