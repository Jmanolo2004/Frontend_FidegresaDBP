import { useCallback, useEffect, useEffectEvent, useState } from "react";
import { isCanceledError } from "../services/apiErrors";

/**
 * Ejecuta una función asíncrona que recibe { signal } y expone data, error y loading.
 * Se vuelve a ejecutar cuando cambia `key` o al llamar reload(); cancela la petición
 * anterior al recargar o al desmontar la pantalla.
 */
export function useAsync(asyncFunction, key) {
  const [state, setState] = useState({ key, data: null, error: null, loading: true, nonce: 0 });

  // Si cambia la clave (por ejemplo, otra tarjeta), se reinicia durante el render.
  if (state.key !== key) {
    setState({ key, data: null, error: null, loading: true, nonce: 0 });
  }

  const runRequest = useEffectEvent(signal => asyncFunction({ signal }));

  useEffect(() => {
    if (!state.loading) return undefined;
    const controller = new AbortController();
    runRequest(controller.signal)
      .then(data => {
        if (!controller.signal.aborted) setState(previous => ({ ...previous, data, error: null, loading: false }));
      })
      .catch(error => {
        if (!controller.signal.aborted && !isCanceledError(error)) {
          setState(previous => ({ ...previous, error, loading: false }));
        }
      });
    return () => controller.abort();
  }, [state.key, state.nonce, state.loading]);

  const reload = useCallback(() => {
    setState(previous => ({ ...previous, loading: true, error: null, nonce: previous.nonce + 1 }));
  }, []);

  const setData = useCallback(updater => {
    setState(previous => ({ ...previous, data: typeof updater === "function" ? updater(previous.data) : updater }));
  }, []);

  return { data: state.data, error: state.error, loading: state.loading, reload, setData };
}
