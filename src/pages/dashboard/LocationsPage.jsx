import { useState } from "react";
import { Link, useLocation, useOutletContext, useSearchParams } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";
import { KpiCard } from "../../components/common/KpiCard";
import { StatusPill } from "../../components/common/StatusPill";
import { Switch } from "../../components/common/Switch";
import { EmptyState } from "../../components/common/EmptyState";
import { ErrorState } from "../../components/common/ErrorState";
import { Icon } from "../../components/common/Icon";
import { KpiSkeletonGrid, Skeleton } from "../../components/common/Skeleton";
import { LocationDialog } from "../../components/locations/LocationDialog";
import { useBranchToggle } from "../../components/locations/useBranchToggle";
import { useFetch } from "../../hooks/useFetch";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useSettings } from "../../hooks/useSettings";
import { branchService } from "../../services/branchService";
import { pluralize } from "../../utils/format";
import { findSubscriptionPlan, SUBSCRIPTION_PLANS } from "../../utils/subscriptionPlans";

export default function LocationsPage() {
  useDocumentTitle("Ubicaciones");
  const { data: locations, error, reload, refresh, setData } = useFetch(({ signal }) => branchService.getAll({ signal }), []);
  const { settings } = useSettings();
  const routeLocation = useLocation();
  const [searchParams] = useSearchParams();
  const { reloadBranches } = useOutletContext();
  const [dialog, setDialog] = useState({ open: false, location: null });
  const [limitMessage, setLimitMessage] = useState(routeLocation.state?.registrationLimit ? "La cuenta se creó, pero no se agregó el local solicitado porque ya se alcanzó el límite del plan." : "");
  const { toggle, pendingId } = useBranchToggle(setData);

  const list = locations || [];
  const selectedBranchId = searchParams.get("branchId") || "";
  const visibleLocations = selectedBranchId ? list.filter(location => String(location.id) === selectedBranchId) : list;
  const activeCount = visibleLocations.filter(location => location.activa).length;
  const linkedCustomers = visibleLocations.reduce((total, location) => total + location.clientes, 0);
  const categories = new Set(visibleLocations.map(location => location.categoria));
  const plan = findSubscriptionPlan(settings.plan || "Emprende");

  const addLocation = () => {
    if (!plan) {
      setLimitMessage("No se reconoce tu plan actual. Revisa la suscripción en Configuración.");
    } else if (list.length >= plan.maxLocations) {
      const maximum = plan === SUBSCRIPTION_PLANS[SUBSCRIPTION_PLANS.length - 1];
      setLimitMessage(`Límite de locales alcanzado: ${plan.name} permite hasta ${plan.maxLocations}. Los locales pausados también cuentan.${maximum ? " Es el plan máximo disponible." : ""}`);
    } else {
      setLimitMessage("");
      setDialog({ open: true, location: null });
    }
  };

  const handleSaved = () => {
    setDialog({ open: false, location: null });
    refresh();
    reloadBranches();
  };

  return (
    <>
      <PageHeader
        title="Ubicaciones"
        summary={locations ? `${activeCount} de ${visibleLocations.length} ${visibleLocations.length === 1 ? "local recibe" : "locales reciben"} clientes en tu programa.` : "Cargando tus locales…"}
        actions={
          <button type="button" className="primary-button" onClick={addLocation} disabled={!locations}>
            <Icon name="pin" size={16} />
            Agregar local
          </button>
        }
      />
      {limitMessage && (
        <p className="form-alert" role="alert">
          {limitMessage}{" "}<Link to="/panel/configuracion#suscripcion">Ver suscripción</Link>.
        </p>
      )}
      {error && !locations ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !locations ? (
        <>
          <KpiSkeletonGrid />
          <div className="location-grid">
            {[0, 1, 2].map(index => (
              <Skeleton key={index} height={170} radius={13} />
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="stats-grid">
            <KpiCard label="Locales" value={visibleLocations.length} explanation="Negocios registrados en tu comunidad." icon="pin" />
            <KpiCard label="Activos" value={activeCount} explanation="Locales que reciben clientes." icon="chart" />
            <KpiCard label="Clientes vinculados" value={linkedCustomers} explanation="Personas relacionadas con tus locales." icon="users" />
            <KpiCard label="Categorías" value={categories.size} explanation="Tipos de negocio que participan." icon="card" />
          </div>
          {selectedBranchId && visibleLocations.length === 0 ? (
            <EmptyState message="No encontramos la ubicación seleccionada. Elige otra ubicación o muestra todos los locales." />
          ) : list.length === 0 ? (
            <EmptyState message="Todavía no hay locales. Agrega el primero para comenzar." actionLabel="Agregar local" onAction={addLocation} />
          ) : (
            <div className="location-grid">
              {visibleLocations.map(location => (
                <article className="panel location-card" key={location.id}>
                  <span className="location-icon">
                    <Icon name="pin" size={22} />
                  </span>
                  <div className="location-title">
                    <h3>{location.nombre}</h3>
                    <span className="category-label">{location.categoria}</span>
                  </div>
                  <p>
                    {location.direccion}
                    <br />
                    {location.distrito} · {location.horario}
                  </p>
                  <div className="location-meta">
                    <StatusPill variant={location.activa ? "active" : "inactive"}>
                      {location.activa ? "Activo" : "En pausa"} · {pluralize(location.clientes, "cliente", "clientes")}
                    </StatusPill>
                    <div className="location-actions">
                      <button className="text-button" type="button" onClick={() => setDialog({ open: true, location })} aria-label={`Editar ${location.nombre}`}>
                        Editar
                      </button>
                      <Switch checked={location.activa} onChange={active => toggle(location, active)} label={`${location.activa ? "Pausar" : "Activar"} ${location.nombre}`} disabled={pendingId === location.id} />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
      <LocationDialog open={dialog.open} location={dialog.location} onClose={() => setDialog({ open: false, location: null })} onSaved={handleSaved} onLimitReached={message => { setDialog({ open: false, location: null }); setLimitMessage(message); refresh(); }} />
    </>
  );
}
