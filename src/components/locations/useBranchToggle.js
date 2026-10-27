import { useState } from "react";
import { branchService } from "../../services/branchService";
import { useToast } from "../../hooks/useToast";
import { useSettings } from "../../hooks/useSettings";

/** Activa o pausa un local con actualización optimista y reversión si el servidor falla. */
export function useBranchToggle(setLocations) {
  const { showToast, showError } = useToast();
  const { refreshNotices } = useSettings();
  const [pendingId, setPendingId] = useState(null);

  const toggle = async (location, active) => {
    setPendingId(location.id);
    setLocations(current => current.map(item => (item.id === location.id ? { ...item, activa: active } : item)));
    try {
      await branchService.setActive(location.id, active);
      showToast(`${location.nombre}: ${active ? "local activado" : "local pausado"}.`);
      refreshNotices();
    } catch (error) {
      setLocations(current => current.map(item => (item.id === location.id ? { ...item, activa: !active } : item)));
      showError(error.message);
    } finally {
      setPendingId(null);
    }
  };

  return { toggle, pendingId };
}
