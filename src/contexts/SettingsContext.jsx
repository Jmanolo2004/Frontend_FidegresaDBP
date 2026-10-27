import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { settingsService } from "../services/settingsService";
import { useFetch } from "../hooks/useFetch";

export const SettingsContext = createContext(null);

/** Configuración del negocio y avisos del panel. Solo existe dentro de las rutas protegidas. */
export function SettingsProvider({ children }) {
  const settingsRequest = useFetch(({ signal }) => settingsService.get({ signal }), []);
  const noticesRequest = useFetch(({ signal }) => settingsService.getNotices({ signal }), []);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    if (settingsRequest.data) setSettings(settingsRequest.data);
  }, [settingsRequest.data]);

  useEffect(() => {
    const isDark = settings?.tema === "oscuro";
    document.body.classList.toggle("dark-theme", isDark);
    document.documentElement.style.setProperty("--brand-primary", settings?.colorPrincipal || "#603f2a");
    return () => document.body.classList.remove("dark-theme");
  }, [settings?.tema, settings?.colorPrincipal]);

  const { refresh: refreshNotices } = noticesRequest;

  // Actualización optimista: la interfaz cambia al instante y se revierte si el servidor falla.
  const updateSettings = useCallback(
    async changes => {
      const previous = settings;
      setSettings(current => ({ ...current, ...changes, avisos: { ...current?.avisos, ...changes.avisos } }));
      try {
        const saved = await settingsService.update(changes);
        setSettings(saved);
        refreshNotices();
        return saved;
      } catch (error) {
        setSettings(previous);
        throw error;
      }
    },
    [settings, refreshNotices]
  );

  const resetSettings = useCallback(async () => {
    const saved = await settingsService.reset();
    setSettings(saved);
    refreshNotices();
    return saved;
  }, [refreshNotices]);

  const value = useMemo(
    () => ({
      settings,
      loading: settingsRequest.loading && !settings,
      error: settingsRequest.error,
      reloadSettings: settingsRequest.reload,
      updateSettings,
      resetSettings,
      notices: noticesRequest.data || [],
      refreshNotices
    }),
    [settings, settingsRequest.loading, settingsRequest.error, settingsRequest.reload, updateSettings, resetSettings, noticesRequest.data, refreshNotices]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

SettingsProvider.propTypes = { children: PropTypes.node.isRequired };
