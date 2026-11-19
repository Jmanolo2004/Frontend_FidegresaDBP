import { useCallback, useEffect, useEffectEvent, useState } from "react";
import { isCanceledError } from "../services/apiErrors";

const createInitialState = key => ({ key, items: [], page: 0, isLast: false, error: null, mode: "loading", nonce: 0 });

/**
 * Lista paginada con carga inicial, "jalar para actualizar" y scroll infinito.
 * fetchPage recibe { page, signal } y devuelve { items, last }. Cambiar `key` reinicia la lista.
 */
export function usePaginatedList(fetchPage, key) {
  const [state, setState] = useState(() => createInitialState(key));

  if (state.key !== key) {
    setState(createInitialState(key));
  }

  const requestPage = useEffectEvent((page, signal) => fetchPage({ page, signal }));

  useEffect(() => {
    if (state.mode === "idle") return undefined;
    const controller = new AbortController();
    const targetPage = state.page;
    requestPage(targetPage, controller.signal)
      .then(result => {
        if (controller.signal.aborted) return;
        setState(previous => ({
          ...previous,
          items: targetPage === 0 ? result.items : [...previous.items, ...result.items],
          isLast: result.last,
          error: null,
          mode: "idle"
        }));
      })
      .catch(error => {
        if (controller.signal.aborted || isCanceledError(error)) return;
        // Si falló la página siguiente, se vuelve a la última que sí cargó.
        setState(previous => ({ ...previous, error, mode: "idle", page: targetPage === 0 ? 0 : targetPage - 1 }));
      });
    return () => controller.abort();
  }, [state.key, state.page, state.mode, state.nonce]);

  const refresh = useCallback(() => {
    setState(previous => ({ ...previous, page: 0, mode: "refreshing", error: null, nonce: previous.nonce + 1 }));
  }, []);

  const loadMore = useCallback(() => {
    setState(previous =>
      previous.mode === "idle" && !previous.isLast && !previous.error
        ? { ...previous, page: previous.page + 1, mode: "loadingMore", nonce: previous.nonce + 1 }
        : previous
    );
  }, []);

  const retry = useCallback(() => {
    setState(previous =>
      previous.items.length === 0
        ? { ...previous, page: 0, mode: "loading", error: null, nonce: previous.nonce + 1 }
        : { ...previous, page: previous.page + 1, mode: "loadingMore", error: null, nonce: previous.nonce + 1 }
    );
  }, []);

  return {
    items: state.items,
    error: state.error,
    isLast: state.isLast,
    loading: state.mode === "loading",
    refreshing: state.mode === "refreshing",
    loadingMore: state.mode === "loadingMore",
    refresh,
    loadMore,
    retry
  };
}
