import { useState } from "react";
import { LoyaltyCard } from "../cards/LoyaltyCard";
import { CARD_TYPES } from "./landingContent";

/** Selector de los cuatro tipos de tarjeta con su vista real. */
export function CardTypes() {
  const [selectedId, setSelectedId] = useState(CARD_TYPES[0].id);
  const selected = CARD_TYPES.find(type => type.id === selectedId);

  return (
    <section className="types" id="tarjetas">
      <div className="lp-wrap types-grid">
        <div>
          <h2>Cuatro formas de dar las gracias</h2>
          <div className="types-options">
            {CARD_TYPES.map(type => (
              <button type="button" key={type.id} className={`types-option${type.id === selectedId ? " is-selected" : ""}`} aria-pressed={type.id === selectedId} onClick={() => setSelectedId(type.id)}>
                <strong>{type.label}</strong>
                <span>{type.text}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="types-preview" key={selected.id}>
          <LoyaltyCard card={selected.card} stamps={selected.stamps} />
        </div>
      </div>
    </section>
  );
}
