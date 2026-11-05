import PropTypes from "prop-types";
import { PLANS } from "./landingContent";

export function PricingList({ onSelect }) {
  return (
    <section className="plans" id="planes">
      <div className="lp-wrap">
        <h2>Empieza gratis y crece a tu ritmo</h2>
        <ul className="plans-list">
          {PLANS.map(plan => (
            <li className={`plan-row${plan.featured ? " is-featured" : ""}`} key={plan.name}>
              <div className="plan-name">
                <h3>{plan.name}</h3>
                <p>{plan.title}</p>
                {plan.featured && <span className="plan-badge">Más elegido</span>}
              </div>
              <p className="plan-price">
                S/ {plan.price}
                <span>al mes</span>
              </p>
              <ul className="plan-features">
                {plan.features.map(feature => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <button type="button" className="lp-button" onClick={onSelect}>
                {plan.cta}
              </button>
            </li>
          ))}
        </ul>
        <p className="plans-note">Precios referenciales en soles, con IGV incluido.</p>
      </div>
    </section>
  );
}

PricingList.propTypes = { onSelect: PropTypes.func.isRequired };
