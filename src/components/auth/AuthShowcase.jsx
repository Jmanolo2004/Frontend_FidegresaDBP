import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Icon } from "../common/Icon";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import stampsCard from "../../assets/card-stamps.png";
import levelsCard from "../../assets/card-levels.png";
import cashbackCard from "../../assets/card-cashback.png";
import giftcardCard from "../../assets/card-giftcard.png";

const SHOWCASE_CARDS = [
  { src: stampsCard, alt: "Ejemplo de tarjeta de estampillas con código QR ilustrativo" },
  { src: levelsCard, alt: "Ejemplo de tarjeta de niveles con código QR ilustrativo" },
  { src: cashbackCard, alt: "Ejemplo de tarjeta de cashback con código QR ilustrativo" },
  { src: giftcardCard, alt: "Ejemplo de tarjeta de regalo con código QR ilustrativo" }
];
const LOOP_CARDS = [...SHOWCASE_CARDS.slice(-2), ...SHOWCASE_CARDS, ...SHOWCASE_CARDS.slice(0, 2)];

export function AuthShowcase({ variant = "login" }) {
  const cardsRef = useRef(null);
  const settleTimer = useRef(null);
  const [paused, setPaused] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const cardPosition = (cards, index) => {
    const first = cards.children[0].getBoundingClientRect();
    const target = cards.children[index].getBoundingClientRect();
    return target.left - first.left;
  };

  useLayoutEffect(() => {
    const cards = cardsRef.current;
    if (cards) cards.scrollTo({ left: cardPosition(cards, 2), behavior: "instant" });
    return () => clearTimeout(settleTimer.current);
  }, []);

  const scrollCards = useCallback(direction => {
    const cards = cardsRef.current;
    if (!cards || !cards.children[1]) return;
    cards.scrollBy({
      left: direction * cardPosition(cards, 1),
      behavior: reducedMotion ? "auto" : "smooth"
    });
  }, [reducedMotion]);

  useEffect(() => {
    if (paused || hovering || focused || reducedMotion) return undefined;
    const timer = setInterval(() => scrollCards(-1), 4000);
    return () => clearInterval(timer);
  }, [paused, hovering, focused, reducedMotion, scrollCards]);

  const normalizeLoop = () => {
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      const cards = cardsRef.current;
      if (!cards) return;
      const cycleWidth = cardPosition(cards, 4);
      if (cards.scrollLeft < 1) cards.scrollTo({ left: cards.scrollLeft + cycleWidth, behavior: "instant" });
      else if (cards.scrollLeft >= cardPosition(cards, 6) - 1) cards.scrollTo({ left: cards.scrollLeft - cycleWidth, behavior: "instant" });
    }, 150);
  };

  return (
    <aside className={`auth-showcase${variant === "register" ? " register-showcase" : ""}`} aria-label="Tarjetas de fidelización">
      <div className="showcase-copy">
        {variant === "register" ? (
          <>
            <span className="showcase-kicker">Bienvenido a tu comunidad</span>
            <h2>Tu negocio tiene<br />mucho para compartir.</h2>
          </>
        ) : <h2>Pequeños momentos,<br />grandes lealtades.</h2>}
      </div>
      <div className="showcase-gallery" onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)} onFocusCapture={() => setFocused(true)} onBlurCapture={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}>
        {!reducedMotion && (
          <button type="button" className="showcase-arrow showcase-pause" aria-label={paused ? "Reanudar movimiento de tarjetas" : "Pausar movimiento de tarjetas"} onClick={() => setPaused(value => !value)}>
            <span aria-hidden="true">{paused ? "▶" : "Ⅱ"}</span>
          </button>
        )}
        <button type="button" className="showcase-arrow" aria-label="Ver tarjetas anteriores" onClick={() => scrollCards(-1)}>
          <Icon name="chevronLeft" />
        </button>
        <div className="showcase-cards" ref={cardsRef} role="region" aria-label="Tarjetas de demostración" tabIndex={0} onScroll={normalizeLoop}>
          {LOOP_CARDS.map((card, index) => (
            <img className="showcase-card-example" key={`${index}-${card.src}`} src={card.src} alt={index < 2 || index >= 6 ? "" : card.alt} aria-hidden={index < 2 || index >= 6 ? "true" : undefined} />
          ))}
        </div>
        <button type="button" className="showcase-arrow" aria-label="Ver tarjetas siguientes" onClick={() => scrollCards(1)}>
          <Icon name="chevronRight" />
        </button>
      </div>
      <span className="showcase-decoration" aria-hidden="true" />
    </aside>
  );
}

AuthShowcase.propTypes = { variant: PropTypes.oneOf(["login", "register"]) };
