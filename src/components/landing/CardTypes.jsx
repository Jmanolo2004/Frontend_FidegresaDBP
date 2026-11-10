import { useState } from "react";
import cashbackCard from "../../assets/card-cashback.png";
import basketCashbackCard from "../../assets/card-cashback-basket.png";
import cineGiftCard from "../../assets/card-gift-cine.png";
import giftcardCard from "../../assets/card-giftcard.png";
import levelsCard from "../../assets/card-levels.png";
import arenaLevelsCard from "../../assets/card-levels-arena.png";
import surfLevelsCard from "../../assets/card-levels-surf.png";
import stampsCard from "../../assets/card-stamps.png";
import kaitoStampsCard from "../../assets/card-stamps-kaito.png";
import { CARD_TYPES } from "./landingContent";

const CARD_ROWS = [
  [
    { id: "stamps-kaito", program: "stamps", src: kaitoStampsCard, alt: "Tarjeta de estampillas de Kaito Sushi" },
    { id: "levels-arena", program: "levels", src: arenaLevelsCard, alt: "Tarjeta de niveles de Arena Futsal 5" }
  ],
  [
    { id: "stamps", program: "stamps", src: stampsCard, alt: "Tarjeta de estampillas con progreso y código QR" },
    { id: "levels", program: "levels", src: levelsCard, alt: "Tarjeta de fidelización por niveles con código QR" }
  ],
  [
    { id: "cashback", program: "cashback", src: cashbackCard, alt: "Tarjeta de cashback con saldo y código QR" },
    { id: "gift", program: "gift", src: giftcardCard, alt: "Tarjeta de regalo con saldo y código QR" }
  ],
  [
    { id: "gift-cine", program: "gift", src: cineGiftCard, alt: "Tarjeta de regalo de Cine Estelar" },
    { id: "levels-surf", program: "levels", src: surfLevelsCard, alt: "Tarjeta de niveles de Ola Brava Surf" }
  ],
  [
    { id: "cashback-basket", program: "cashback", src: basketCashbackCard, alt: "Tarjeta de cashback de Triple Básquet Club" },
    { id: "gift-cine-copy", program: "gift", src: cineGiftCard, alt: "Ejemplo de tarjeta de regalo de Cine Estelar" }
  ]
];

const CARD_LANES = [
  { id: "up", direction: "up", rows: CARD_ROWS.filter((_, index) => index % 2 === 0) },
  { id: "down", direction: "down", rows: CARD_ROWS.filter((_, index) => index % 2 === 1) }
];

/** Selector de programas junto con ejemplos visuales de los cuatro tipos de tarjeta. */
export function CardTypes() {
  const [selectedId, setSelectedId] = useState(CARD_TYPES[0].id);

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
        <div className="types-gallery-frame" role="region" aria-label="Galería animada de tarjetas de fidelización">
          {CARD_LANES.map(lane => (
            <div className="types-lane" key={lane.id}>
              <div className={`types-track is-${lane.direction}`}>
                {[...lane.rows, ...lane.rows].map((row, rowIndex) => (
                  <div className="types-row" key={`${lane.id}-${rowIndex}`} aria-hidden={rowIndex >= lane.rows.length}>
                    {row.map(card => (
                      <figure className={`types-card${card.program === selectedId ? " is-selected" : ""}`} key={card.id}>
                        <img src={card.src} alt={rowIndex >= lane.rows.length ? "" : card.alt} loading="lazy" />
                      </figure>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
