import { useCallback, useEffect, useRef, useState } from "react";
import { isCanceledError } from "../api/apiErrors";

/**
 * Ejecuta una petición al montar y cada vez que cambian las dependencias.
 * Cancela la petición anterior con AbortController para evitar fugas de memoria
 * y respuestas fuera de orden.
 */
export function useFetch(fetcher, dependencies = [], { enabled = true } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: enabled });
  const controllerRef = useRef(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const run = useCallback(async ({ silent = false } = {}) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState(previous => ({ ...previous, loading: !silent, error: null }));
    try {
      const data = await fetcherRef.current({ signal: controller.signal });
      if (!controller.signal.aborted) setState({ data, error: null, loading: false });
      return data;
    } catch (error) {
      if (isCanceledError(error) || controller.signal.aborted) return undefined;
      setState(previous => ({ ...previous, error, loading: false }));
      return undefined;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    run();
    return () => controllerRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, run, ...dependencies]);

  const setData = useCallback(updater => {
    setState(previous => ({
      ...previous,
      data: typeof updater === "function" ? updater(previous.data) : updater
    }));
  }, []);

  return {
    data: state.data,
    error: state.error,
    loading: state.loading,
    reload: run,
    refresh: useCallback(() => run({ silent: true }), [run]),
    setData
  };
}
