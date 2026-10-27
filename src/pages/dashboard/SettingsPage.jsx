import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";
import { Icon } from "../../components/common/Icon";
import { Switch } from "../../components/common/Switch";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { Skeleton } from "../../components/common/Skeleton";
import { BrandNameDialog } from "../../components/settings/BrandNameDialog";
import { useBranchToggle } from "../../components/locations/useBranchToggle";
import { useSettings } from "../../hooks/useSettings";
import { useFetch } from "../../hooks/useFetch";
import { useToast } from "../../hooks/useToast";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { branchService } from "../../services/branchService";
import { NOTICE_PREFERENCES } from "../../utils/constants";
import { USE_MOCK } from "../../api/apiClient";

function SettingsCard({ icon, title, subtitle, wide = false, children }) {
  return (
    <article className={`panel settings-card${wide ? " wide" : ""}`}>
      <div className="settings-card-heading">
        <span className="settings-icon">
          <Icon name={icon} size={19} />
        </span>
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>
      {children}
    </article>
  );
}

export default function SettingsPage() {
  useDocumentTitle("Configuración");
  const { settings, updateSettings, resetSettings } = useSettings();
  const { openProfile } = useOutletContext();
  const { showToast, showError } = useToast();
  const locations = useFetch(({ signal }) => branchService.getAll({ signal }), []);
  const { toggle, pendingId } = useBranchToggle(locations.setData);
  const [brandOpen, setBrandOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const saveSetting = async (changes, message) => {
    try {
      await updateSettings(changes);
      showToast(message);
    } catch (error) {
      showError(error.message);
    }
  };

  const resetData = async () => {
    try {
      await resetSettings();
      await locations.refresh();
      showToast("Datos de demostración restablecidos.");
      setResetOpen(false);
    } catch (error) {
      showError(error.message);
    }
  };

  const isDark = settings.tema === "oscuro";

  return (
    <>
      <PageHeader title="Configuración" summary={`El programa “${settings.marca}” está en tema ${isDark ? "oscuro" : "claro"}.`} />
      <div className="settings-grid">
        <SettingsCard icon="star" title="Tu programa" subtitle="El nombre que ven tus clientes">
          <div className="settings-line">
            <div>
              <strong>Nombre del programa</strong>
              <small>{settings.marca}</small>
            </div>
            <button type="button" className="secondary-button" onClick={() => setBrandOpen(true)}>
              Editar
            </button>
          </div>
          <div className="settings-line">
            <div>
              <strong>Paleta</strong>
              <small>Café y crema</small>
            </div>
            <span className="theme-swatch" aria-label="Paleta café" />
          </div>
        </SettingsCard>

        <SettingsCard icon="settings" title="Aspecto" subtitle="Elige el tema de tu espacio">
          <div className="settings-line">
            <div>
              <strong>Modo de visualización</strong>
              <small>{isDark ? "Tema oscuro" : "Tema claro"}</small>
            </div>
            <div className="theme-options">
              <button type="button" className={`theme-chip${!isDark ? " selected" : ""}`} onClick={() => saveSetting({ tema: "claro" }, "Tema claro activado.")} aria-label="Tema claro" aria-pressed={!isDark} />
              <button type="button" className={`theme-chip dark-chip${isDark ? " selected" : ""}`} onClick={() => saveSetting({ tema: "oscuro" }, "Tema oscuro activado.")} aria-label="Tema oscuro" aria-pressed={isDark} />
            </div>
          </div>
        </SettingsCard>

        <SettingsCard icon="users" title="Mi perfil" subtitle="Información de administradora">
          <div className="settings-line">
            <div>
              <strong>{settings.perfilNombre}</strong>
              <small>
                {settings.perfilCorreo}
                {settings.perfilTelefono ? ` · ${settings.perfilTelefono}` : ""}
              </small>
            </div>
            <button type="button" className="secondary-button" onClick={openProfile}>
              Editar perfil
            </button>
          </div>
        </SettingsCard>

        <SettingsCard icon="pin" title="Locales participantes" subtitle="Controla dónde está disponible el programa">
          {locations.data
            ? locations.data.map(location => (
                <div className="settings-line" key={location.id}>
                  <div>
                    <strong>{location.nombre}</strong>
                    <small>
                      {location.categoria} · {location.activa ? "Activo" : "En pausa"}
                    </small>
                  </div>
                  <Switch checked={location.activa} onChange={active => toggle(location, active)} label={`Cambiar estado de ${location.nombre}`} disabled={pendingId === location.id} />
                </div>
              ))
            : [0, 1, 2].map(index => <Skeleton key={index} height={38} className="skeleton-gap" />)}
          <Link className="text-button" to="/panel/ubicaciones">
            Administrar locales
          </Link>
        </SettingsCard>

        <SettingsCard icon="bell" title="Avisos del negocio" subtitle="Elige qué situaciones quieres revisar en tu panel" wide>
          {NOTICE_PREFERENCES.map(({ key, label, description }) => {
            const enabled = settings.avisos?.[key] !== false;
            return (
              <div className="settings-line" key={key}>
                <div>
                  <strong>{label}</strong>
                  <small>{description}</small>
                </div>
                <Switch
                  checked={enabled}
                  onChange={value => saveSetting({ avisos: { [key]: value } }, `Avisos de ${label.toLowerCase()} ${value ? "activados" : "desactivados"}.`)}
                  label={`${enabled ? "Desactivar" : "Activar"} aviso: ${label}`}
                />
              </div>
            );
          })}
        </SettingsCard>

        {USE_MOCK && (
          <SettingsCard icon="reward" title="Datos de demostración" subtitle="Útil para preparar una presentación desde cero" wide>
            <div className="settings-line">
              <div>
                <strong>Restablecer datos</strong>
                <small>Vuelve a cargar los clientes, tarjetas, locales y reseñas originales.</small>
              </div>
              <button type="button" className="danger-button" onClick={() => setResetOpen(true)}>
                Restablecer datos
              </button>
            </div>
          </SettingsCard>
        )}
      </div>
      <BrandNameDialog open={brandOpen} onClose={() => setBrandOpen(false)} />
      <ConfirmDialog open={resetOpen} title="Restablecer datos" description="Se reemplazarán tus cambios por los datos originales de demostración." confirmLabel="Restablecer" onConfirm={resetData} onClose={() => setResetOpen(false)} />
    </>
  );
}
