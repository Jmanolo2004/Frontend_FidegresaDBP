import { useEffect, useRef, useState } from "react";
import { PhoneCard } from "./PhoneCard";
import { STORY_STEPS } from "./landingContent";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { useScrollProgress } from "../../hooks/useScrollProgress";

const STAMP_GOAL = 10;
const STEP_LIMITS = [0.3, 0.72];

/** Al bajar por la sección, la tarjeta se llena de sellos hasta llegar al premio. */
export function ScrollStory() {
  const sectionRef = useRef(null);
  const reducedMotion = usePrefersReducedMotion();
  const desktopProgress = useScrollProgress(sectionRef, !reducedMotion);
  const [mobileProgress, setMobileProgress] = useState(null);
  useEffect(() => {
    if (reducedMotion) return undefined;
    let frame = 0;
    const measure = () => {
      frame = 0;
      if (!window.matchMedia("(max-width: 860px)").matches) {
        setMobileProgress(null);
        return;
      }
      const bounds = sectionRef.current?.getBoundingClientRect();
      if (bounds?.height) setMobileProgress(Math.min(1, Math.max(0, (window.innerHeight / 2 - bounds.top) / bounds.height)));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [reducedMotion]);
  const progress = mobileProgress ?? desktopProgress;
  const stamps = reducedMotion ? STAMP_GOAL : Math.min(STAMP_GOAL, Math.floor(progress * (STAMP_GOAL + 0.4)));
  const activeStep = STEP_LIMITS.filter(limit => progress >= limit).length;

  return (
    <section className={`story${reducedMotion ? " is-static" : ""}`} id="como-funciona" ref={sectionRef}>
      <div className="story-stage">
        <div className="story-copy">
          <h2>De la primera visita al premio</h2>
          <ol className="story-steps">
            {STORY_STEPS.map((step, index) => (
              <li key={step.title} className={!reducedMotion && index === activeStep ? "is-active" : ""}>
                <span className="story-number">{index + 1}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="story-phone">
          <p className="story-counter" aria-hidden="true">
            {stamps}<span>/{STAMP_GOAL}</span>
          </p>
          <PhoneCard stamps={stamps} />
        </div>
      </div>
    </section>
  );
}
