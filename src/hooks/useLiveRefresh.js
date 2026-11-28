import { useEffect, useRef } from "react";

/**
 * Llama a refresh cada intervalMs mientras la pestaña está visible, y una vez al volver a ella.
 * Así lo que el staff registra desde la app de caja aparece en el panel sin recargar la página.
 */
export function useLiveRefresh(refresh, intervalMs = 10000, enabled = true) {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    if (!enabled) return undefined;
    let timer = null;
    const tick = () => {
      if (document.visibilityState === "visible") refreshRef.current();
    };
    const start = () => {
      clearInterval(timer);
      timer = setInterval(tick, intervalMs);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        tick();
        start();
      } else clearInterval(timer);
    };
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [intervalMs, enabled]);
}
