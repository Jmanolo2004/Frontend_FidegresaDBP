import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";
import { Icon } from "../../components/common/Icon";
import { Switch } from "../../components/common/Switch";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { Modal } from "../../components/common/Modal";
import { FormField } from "../../components/common/FormField";
import { ErrorState } from "../../components/common/ErrorState";
import { Skeleton } from "../../components/common/Skeleton";
import { BrandNameDialog } from "../../components/settings/BrandNameDialog";
import { ProfileForm } from "../../components/settings/ProfileDialog";
import { useBranchToggle } from "../../components/locations/useBranchToggle";
import { useAuth } from "../../hooks/useAuth";
import { useSettings } from "../../hooks/useSettings";
import { useFetch } from "../../hooks/useFetch";
import { useToast } from "../../hooks/useToast";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { branchService } from "../../services/branchService";
import { NOTICE_PREFERENCES } from "../../utils/constants";
import { findSubscriptionPlan, SUBSCRIPTION_PLANS } from "../../utils/subscriptionPlans";
import { USE_MOCK } from "../../api/apiClient";

function SettingsCard({ icon, title, subtitle, children }) {
  return (
    <article className="panel settings-card">
      <div className="settings-card-heading">
        <span className="settings-icon"><Icon name={icon} size={19} /></span>
        <div><h2>{title}</h2><p>{subtitle}</p></div>
      </div>
      {children}
    </article>
  );
}

function SettingsSection({ title, children }) {
  const id = `settings-${title.toLowerCase().replaceAll(" ", "-")}`;
  return (
    <section className="settings-section" aria-labelledby={id}>
      <h2 className="settings-section-title" id={id}>{title}</h2>
      <div className="settings-section-grid">{children}</div>
    </section>
  );
}

function SettingsLink({ hash, icon, title, subtitle, badge, danger = false }) {
  return (
    <Link to={`/panel/configuracion#${hash}`} className={`panel settings-navigation-card${danger ? " is-danger" : ""}`}>
      <span className="settings-icon"><Icon name={icon} size={22} /></span>
      <span className="settings-navigation-copy"><strong>{title}</strong><small>{subtitle}</small></span>
      {badge && <span className="settings-navigation-badge">{badge}</span>}
      <Icon name="chevronRight" size={18} />
    </Link>
  );
}

function DetailHeader({ icon, title, subtitle }) {
  return (
    <>
      <Link to="/panel/configuracion" className="back-link"><Icon name="chevronLeft" size={16} /> Volver a Configuración</Link>
      <div className="settings-detail-heading">
        <span className="settings-icon"><Icon name={icon} size={22} /></span>
        <PageHeader title={title} summary={subtitle} />
      </div>
    </>
  );
}

export default function SettingsPage() {
  useDocumentTitle("Configuración");
  const { settings, updateSettings, upgradeSubscription, resetSettings } = useSettings();
  const { deleteDemoAccount } = useAuth();
  const routeLocation = useLocation();
  const navigate = useNavigate();
  const { showToast, showError } = useToast();
  const locations = useFetch(({ signal }) => branchService.getAll({ signal }), []);
  const { toggle, pendingId } = useBranchToggle(locations.setData);
  const [brandOpen, setBrandOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [upgradePlan, setUpgradePlan] = useState(null);
  const [upgrading, setUpgrading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);

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

  const currentPlan = findSubscriptionPlan(settings.plan || "Emprende");
  const currentIndex = SUBSCRIPTION_PLANS.indexOf(currentPlan);
  const nextPlan = SUBSCRIPTION_PLANS[currentIndex + 1];
  const isDark = settings.tema === "oscuro";
  const detail = routeLocation.hash.slice(1);
  const goBack = () => navigate("/panel/configuracion");

  const confirmUpgrade = async () => {
    setUpgrading(true);
    try {
      await upgradeSubscription(upgradePlan.id);
      setUpgradePlan(null);
      showToast(`Plan ${upgradePlan.name} activado. El pago es simulado: no se realizó ningún cobro.`);
    } catch (error) {
      showError(error.message);
    } finally {
      setUpgrading(false);
    }
  };

  const confirmDelete = async () => {
    if (deleteText !== "ELIMINAR") return;
    setDeleting(true);
    try {
      await deleteDemoAccount();
      showToast("Tu cuenta y los datos del negocio fueron eliminados.");
      navigate("/login", { replace: true });
    } catch (error) {
      showError(error.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      {detail === "perfil" ? (
        <>
          <DetailHeader icon="users" title="Mi perfil" subtitle="Nombre, correo de contacto y teléfono" />
          <ProfileForm embedded onClose={goBack} />
        </>
      ) : detail === "seguridad" ? (
        <>
          <DetailHeader icon="lock" title="Seguridad" subtitle="Contraseña, verificación en dos pasos y sesiones" />
          <div className="settings-detail-stack">
            <section className="panel settings-detail-panel">
              <h2>Contraseña</h2>
              <p>Podrás actualizar tu contraseña cuando se conecte el backend. Por ahora no se guardan contraseñas.</p>
              <div className="form-grid">
                <FormField label="Contraseña actual" full><input type="password" className="form-control" autoComplete="current-password" disabled /></FormField>
                <FormField label="Nueva contraseña"><input type="password" className="form-control" autoComplete="new-password" disabled /></FormField>
                <FormField label="Repetir nueva contraseña"><input type="password" className="form-control" autoComplete="new-password" disabled /></FormField>
              </div>
              <button type="button" className="primary-button" disabled>Guardar contraseña</button>
            </section>
            <section className="panel settings-detail-panel">
              <h2>Verificación en dos pasos</h2>
              <p>La activación y el estado de la verificación estarán disponibles al conectar el backend.</p>
              <div className="settings-line">
                <div><strong>Pedir código al iniciar sesión</strong><small>Con una aplicación de autenticación · Estado no disponible</small></div>
                <Switch checked={false} onChange={() => {}} label="Verificación en dos pasos no disponible" disabled />
              </div>
            </section>
            <section className="panel settings-detail-panel">
              <div className="settings-sessions-heading">
                <div>
                  <h2>Sesiones activas</h2>
                  <p>Dispositivos donde tu cuenta está abierta.</p>
                </div>
                <button type="button" className="secondary-button" disabled>Cerrar todas las demás</button>
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th scope="col">Dispositivo</th><th scope="col">Ubicación</th><th scope="col">Última actividad</th></tr></thead>
                  <tbody><tr><td colSpan={3} className="settings-sessions-empty">Las sesiones y su cierre estarán disponibles al conectar el backend.</td></tr></tbody>
                </table>
              </div>
            </section>
          </div>
        </>
      ) : detail === "marca" ? (
        <>
          <DetailHeader icon="star" title="Ajustes de marca" subtitle="Nombre y datos del negocio" />
          <section className="panel settings-detail-panel">
            <h2>Datos de la marca</h2>
            <p>El nombre se muestra en tu programa de fidelización.</p>
            <div className="settings-line"><div><strong>Nombre de la marca</strong><small>{settings.marca}</small></div><button type="button" className="secondary-button" onClick={() => setBrandOpen(true)}>Editar</button></div>
            <p>Los datos fiscales, país, idioma y moneda aún no se pueden configurar.</p>
            <div className="form-grid">
              <FormField label="Razón social"><input className="form-control" placeholder="No disponible" disabled /></FormField>
              <FormField label="Identificador fiscal (RUC)"><input className="form-control" placeholder="No disponible" disabled /></FormField>
              <FormField label="Giro / Actividad económica"><input className="form-control" placeholder="No disponible" disabled /></FormField>
              <FormField label="Dirección fiscal"><input className="form-control" placeholder="No disponible" disabled /></FormField>
              <FormField label="País"><input className="form-control" placeholder="No disponible" disabled /></FormField>
              <FormField label="Idioma"><input className="form-control" placeholder="No disponible" disabled /></FormField>
              <FormField label="Moneda" full><input className="form-control" placeholder="No disponible" disabled /></FormField>
            </div>
          </section>
        </>
      ) : detail === "apariencia" ? (
        <>
          <DetailHeader icon="settings" title="Apariencia" subtitle="Colores y modo de visualización" />
          <section className="panel settings-detail-panel">
            <h2>Aspecto</h2>
            <p>Personaliza el modo de visualización de tu espacio.</p>
            <div className="settings-line"><div><strong>Paleta</strong><small>Café y crema</small></div><span className="theme-swatch" role="img" aria-label="Paleta café" /></div>
            <div className="settings-line">
              <div><strong>Modo de visualización</strong><small>{isDark ? "Tema oscuro" : "Tema claro"}</small></div>
              <div className="theme-options">
                <button type="button" className={`theme-chip${!isDark ? " selected" : ""}`} onClick={() => saveSetting({ tema: "claro" }, "Tema claro activado.")} aria-label="Tema claro" aria-pressed={!isDark} />
                <button type="button" className={`theme-chip dark-chip${isDark ? " selected" : ""}`} onClick={() => saveSetting({ tema: "oscuro" }, "Tema oscuro activado.")} aria-label="Tema oscuro" aria-pressed={isDark} />
              </div>
            </div>
            <p>La carga del logo y la personalización del color aún no están disponibles.</p>
          </section>
        </>
      ) : detail === "suscripcion" ? (
        <>
          <DetailHeader icon="card" title="Suscripción y facturación" subtitle="Consulta tu plan y las opciones de mejora" />
          <section className="panel settings-detail-panel">
            <h2>Tu suscripción</h2>
            <p>Todos los planes incluyen las mismas funciones; cambia el número de locales.</p>
            {!currentPlan ? (
              <p className="form-alert" role="alert">No se reconoce tu plan actual.</p>
            ) : (
              <>
                <div className="settings-line"><div><strong>Plan actual: {currentPlan.name}</strong><small>S/ {currentPlan.price} al mes · {currentPlan.locationsLabel}</small></div></div>
                {SUBSCRIPTION_PLANS.map(plan => (
                  <div className="settings-line" key={plan.id}>
                    <div><strong>{plan.name}{plan.id === currentPlan.id ? " · Plan actual" : ""}</strong><small>{plan.locationsLabel} · S/ {plan.price}/mes</small></div>
                    {plan.id === nextPlan?.id && <button type="button" className="secondary-button" onClick={() => setUpgradePlan(plan)}>Mejorar plan</button>}
                    {SUBSCRIPTION_PLANS.indexOf(plan) > currentIndex + 1 && <small>Disponible después de {nextPlan?.name}</small>}
                  </div>
                ))}
              </>
            )}
          </section>
        </>
      ) : detail === "eliminar-cuenta" ? (
        <>
          <DetailHeader icon="trash" title="Eliminar cuenta" subtitle="Revisa las consecuencias antes de continuar" />
          <section className="panel settings-detail-panel">
            <h2>Eliminar cuenta</h2>
            <p>Se eliminará tu cuenta y todos los datos del negocio: locales, clientes, tarjetas, movimientos y reseñas. Esta acción no se puede deshacer.</p>
            <button type="button" className="danger-button" onClick={() => { setDeleteText(""); setDeleteOpen(true); }}>Eliminar cuenta</button>
          </section>
        </>
      ) : (
        <>
          <PageHeader title="Configuración" summary="Administra tu perfil, tu programa de fidelización y las preferencias del negocio." />
          <div className="settings-sections">
            <SettingsSection title="Tu cuenta">
              <SettingsLink hash="perfil" icon="users" title="Mi perfil" subtitle="Nombre, correo y teléfono" />
              <SettingsLink hash="seguridad" icon="lock" title="Seguridad" subtitle="Contraseña, verificación en dos pasos y sesiones" badge="No disponible" />
            </SettingsSection>
            <SettingsSection title="Negocio">
              <SettingsLink hash="marca" icon="star" title="Ajustes de marca" subtitle="Nombre y datos del negocio" />
              <SettingsLink hash="apariencia" icon="settings" title="Apariencia" subtitle="Paleta y modo oscuro" />
            </SettingsSection>
            <SettingsSection title="Plan">
              <SettingsLink hash="suscripcion" icon="card" title="Suscripción y facturación" subtitle="Plan actual y opciones de mejora" badge={currentPlan ? `Plan ${currentPlan.name}` : null} />
            </SettingsSection>
            <SettingsSection title="Zona de peligro">
              <SettingsLink hash="eliminar-cuenta" icon="trash" title="Eliminar cuenta" subtitle="Elimina tu cuenta y los datos del negocio" danger />
            </SettingsSection>
            <SettingsSection title="Operación">
              <SettingsCard icon="pin" title="Locales participantes" subtitle="Controla dónde está disponible el programa">
                {locations.error && !locations.data ? <ErrorState error={locations.error} onRetry={locations.reload} compact /> : locations.data
                  ? locations.data.map(location => (
                    <div className="settings-line" key={location.id}>
                      <div><strong>{location.nombre}</strong><small>{location.categoria} · {location.activa ? "Activo" : "En pausa"}</small></div>
                      <Switch checked={location.activa} onChange={active => toggle(location, active)} label={`Cambiar estado de ${location.nombre}`} disabled={pendingId === location.id} />
                    </div>
                  ))
                  : [0, 1, 2].map(index => <Skeleton key={index} height={38} className="skeleton-gap" />)}
                <Link className="text-button" to="/panel/ubicaciones">Administrar locales</Link>
              </SettingsCard>
              <SettingsCard icon="bell" title="Avisos del negocio" subtitle="Elige qué situaciones quieres revisar en tu panel">
                {NOTICE_PREFERENCES.map(({ key, label, description }) => {
                  const enabled = settings.avisos?.[key] !== false;
                  return (
                    <div className="settings-line" key={key}>
                      <div><strong>{label}</strong><small>{description}</small></div>
                      <Switch checked={enabled} onChange={value => saveSetting({ avisos: { [key]: value } }, `Avisos de ${label.toLowerCase()} ${value ? "activados" : "desactivados"}.`)} label={`${enabled ? "Desactivar" : "Activar"} aviso: ${label}`} />
                    </div>
                  );
                })}
              </SettingsCard>
            </SettingsSection>
            {USE_MOCK && (
              <SettingsSection title="Administración">
                <SettingsCard icon="reward" title="Datos de demostración" subtitle="Útil para preparar una presentación desde cero">
                  <div className="settings-line"><div><strong>Restablecer datos</strong><small>Vuelve a cargar los clientes, tarjetas, locales y reseñas originales.</small></div><button type="button" className="danger-button" onClick={() => setResetOpen(true)}>Restablecer datos</button></div>
                </SettingsCard>
              </SettingsSection>
            )}
          </div>
        </>
      )}
      <BrandNameDialog open={brandOpen} onClose={() => setBrandOpen(false)} />
      <Modal open={Boolean(upgradePlan)} title="Confirmar mejora simulada" subtitle={upgradePlan ? `Cambiarás al plan ${upgradePlan.name}: ${upgradePlan.locationsLabel.toLowerCase()} por S/ ${upgradePlan.price} al mes.` : ""} onClose={() => setUpgradePlan(null)} onSubmit={confirmUpgrade} submitLabel="Confirmar pago simulado" submitting={upgrading}>
        <p className="modal-message">El pago es simulado: no se solicitarán datos de pago ni se hará ningún cobro real.</p>
      </Modal>
      <Modal open={deleteOpen} title="Eliminar cuenta" subtitle="Se borrarán tu cuenta y todos los datos del negocio. No se puede deshacer." onClose={() => setDeleteOpen(false)} onSubmit={confirmDelete} submitLabel="Eliminar cuenta" submitting={deleting} submitDisabled={deleteText !== "ELIMINAR"} danger>
        <FormField label="Escribe ELIMINAR para confirmar"><input className="form-control" value={deleteText} onChange={event => setDeleteText(event.target.value)} autoComplete="off" /></FormField>
      </Modal>
      <ConfirmDialog open={resetOpen} title="Restablecer datos" description="Se reemplazarán tus cambios por los datos originales de demostración." confirmLabel="Restablecer" onConfirm={resetData} onClose={() => setResetOpen(false)} />
    </>
  );
}
