import { useEffect, useState } from "react";

/** Devuelve de 0 a 1 cuánto se ha recorrido una sección alta mientras su contenido queda fijo en pantalla. */
export function useScrollProgress(ref, enabled = true) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;
    let frame = 0;

    const measure = () => {
      frame = 0;
      const element = ref.current;
      if (!element) return;
      const { top, height } = element.getBoundingClientRect();
      const distance = height - window.innerHeight;
      if (distance <= 0) return;
      const next = Math.min(1, Math.max(0, -top / distance));
      setProgress(previous => (Math.abs(previous - next) < 0.004 ? previous : next));
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
  }, [ref, enabled]);

  return progress;
}
