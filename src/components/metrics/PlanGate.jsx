import PropTypes from "prop-types";
import { Link } from "react-router-dom";

export function PlanGate({ locked, title, children }) {
  return (
    <section className={`metrics-plan-gate${locked ? " is-locked" : ""}`}>
      {locked && <div className="metrics-gated-content" aria-hidden="true">{children}</div>}
      {!locked && children}
      {locked && <div className="metrics-gate-card">
        <span className="metrics-gate-label">Disponible en el plan Crece · S/ 119 al mes</span>
        <h3>{title}</h3>
        <p>Conoce estas métricas avanzadas para tomar mejores decisiones en tu negocio.</p>
        <Link className="primary-button" to="/#planes">Ver planes</Link>
      </div>}
    </section>
  );
}

PlanGate.propTypes = { locked: PropTypes.bool.isRequired, title: PropTypes.string.isRequired, children: PropTypes.node.isRequired };
