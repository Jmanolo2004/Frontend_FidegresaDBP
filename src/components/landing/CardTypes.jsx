import { useRef, useState } from "react";
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
const MOBILE_CARDS = CARD_ROWS.flat().filter(card => card.id !== "gift-cine-copy");

/** Selector de programas junto con ejemplos visuales de los cuatro tipos de tarjeta. */
export function CardTypes() {
  const [selectedId, setSelectedId] = useState(CARD_TYPES[0].id);
  const [activeCard, setActiveCard] = useState(0);
  const carouselRef = useRef(null);

  const updateActiveCard = () => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    const left = carousel.getBoundingClientRect().left;
    const distances = Array.from(carousel.children, item => Math.abs(item.getBoundingClientRect().left - left));
    setActiveCard(distances.indexOf(Math.min(...distances)));
  };

  const showCard = index => {
    const carousel = carouselRef.current;
    const card = carousel?.children[index];
    if (card) carousel.scrollTo({ left: carousel.scrollLeft + card.getBoundingClientRect().left - carousel.getBoundingClientRect().left, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

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
                {(lane.rows.length === 2 ? [...lane.rows, lane.rows[0]] : lane.rows).map((row, rowIndex) => (
                  <div className="types-row" key={`${lane.id}-${rowIndex}`} style={{ animationDelay: `${rowIndex * 6}s` }} aria-hidden={rowIndex >= lane.rows.length}>
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
        <div className="types-mobile-gallery" role="region" aria-label="Galería de tarjetas de fidelización">
          <div className="types-carousel" ref={carouselRef} onScroll={updateActiveCard} tabIndex={0} aria-label="Desliza para ver las tarjetas">
            {MOBILE_CARDS.map(card => (
              <figure className={`types-card${card.program === selectedId ? " is-selected" : ""}`} key={card.id}>
                <img src={card.src} alt={card.alt} loading="lazy" />
              </figure>
            ))}
          </div>
          <div className="types-dots" aria-label="Elegir tarjeta">
            {MOBILE_CARDS.map((card, index) => (
              <button type="button" key={card.id} aria-label={`Ver tarjeta ${index + 1}: ${card.alt}`} aria-current={index === activeCard ? "true" : undefined} onClick={() => showCard(index)} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
