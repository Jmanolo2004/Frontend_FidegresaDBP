import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { getBranches } from "../services/branchService";
import { loadSavedBranchId, saveBranchId } from "../services/tokenStorage";
import { useAuth } from "../hooks/useAuth";

export const BranchContext = createContext(null);

const EMPTY_SELECTION = { id: null, source: null }; // source: "gps" | "manual" | "saved"

/**
 * Local donde trabaja el cajero: se elige por GPS o a mano y se guarda en el equipo.
 * El layout raíz lo vuelve a montar al cambiar de usuario, así no queda el local de otra sesión.
 */
export function BranchProvider({ children }) {
  const { status } = useAuth();
  const [branches, setBranches] = useState([]);
  const [selection, setSelection] = useState(EMPTY_SELECTION);
  const [request, setRequest] = useState({ nonce: 0, loading: status === "authenticated" });
  const [error, setError] = useState(null);

  // Carga los locales al montar (con sesión) y cada vez que se pide recargar.
  useEffect(() => {
    if (!request.loading) return undefined;
    let active = true;
    Promise.all([getBranches(), loadSavedBranchId()])
      .then(([list, savedId]) => {
        if (!active) return;
        setBranches(list);
        setError(null);
        setSelection(current => {
          if (current.id && list.some(branch => branch.id === current.id)) return current;
          const fallbackId = savedId && list.some(branch => branch.id === savedId) ? savedId : list.length === 1 ? list[0].id : null;
          return fallbackId ? { id: fallbackId, source: "saved" } : EMPTY_SELECTION;
        });
      })
      .catch(loadError => {
        if (active) setError(loadError);
      })
      .finally(() => {
        if (active) setRequest(previous => ({ ...previous, loading: false }));
      });
    return () => {
      active = false;
    };
  }, [request.nonce, request.loading]);

  const loadBranches = useCallback(() => {
    if (status !== "authenticated") return;
    setRequest(previous => ({ nonce: previous.nonce + 1, loading: true }));
  }, [status]);

  const selectBranch = useCallback(async (branchId, source = "manual") => {
    setSelection({ id: branchId, source });
    try {
      await saveBranchId(branchId);
    } catch {
      // Si no se puede guardar, igual queda seleccionado durante esta sesión.
    }
  }, []);

  const value = useMemo(
    () => ({
      branches,
      selectedBranch: branches.find(branch => branch.id === selection.id) ?? null,
      selectionSource: selection.source,
      loading: request.loading,
      error,
      reload: loadBranches,
      selectBranch
    }),
    [branches, selection, request.loading, error, loadBranches, selectBranch]
  );

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
}
