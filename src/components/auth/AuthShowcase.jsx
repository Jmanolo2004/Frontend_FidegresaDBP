import { useMemo } from "react";
import PropTypes from "prop-types";
import { CardFront } from "../cards/CardFront";
import { createSeedData } from "../../mocks/seedData";

/** Panel derecho de las pantallas de acceso. variant="login" muestra tarjetas; "register" una cita. */
export function AuthShowcase({ variant = "login" }) {
  const cards = useMemo(() => variant === "login" ? createSeedData().tarjetas.filter(card => card.estado === "Activa") : [], [variant]);

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
        <h2>
          Pequeños momentos,
          <br />
          grandes lealtades.
        </h2>
      </div>
      <div className="showcase-cards" role="region" aria-label="Tarjetas de demostración" tabIndex={0}>
        {cards.map(card => (
          <article key={card.id} className="showcase-card-example">
            <CardFront card={card} size="sm" compact />
            <strong>{card.nombre}</strong>
            <span>{card.tipo} · {card.negocio}</span>
          </article>
        ))}
      </div>
      <span className="showcase-decoration" aria-hidden="true" />
    </aside>
  );
}

AuthShowcase.propTypes = { variant: PropTypes.oneOf(["login", "register"]) };
