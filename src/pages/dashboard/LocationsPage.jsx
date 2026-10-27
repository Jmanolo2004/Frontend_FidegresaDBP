import { useState } from "react";
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
import { branchService } from "../../services/branchService";
import { pluralize } from "../../utils/format";

export default function LocationsPage() {
  useDocumentTitle("Ubicaciones");
  const { data: locations, error, reload, refresh, setData } = useFetch(({ signal }) => branchService.getAll({ signal }), []);
  const [dialog, setDialog] = useState({ open: false, location: null });
  const { toggle, pendingId } = useBranchToggle(setData);

  const list = locations || [];
  const activeCount = list.filter(location => location.activa).length;
  const linkedCustomers = list.reduce((total, location) => total + location.clientes, 0);
  const categories = new Set(list.map(location => location.categoria));

  const handleSaved = () => {
    setDialog({ open: false, location: null });
    refresh();
  };

  return (
    <>
      <PageHeader
        title="Ubicaciones"
        summary={locations ? `${activeCount} de ${list.length} locales reciben clientes en tu programa.` : "Cargando tus locales…"}
        actions={
          <button type="button" className="primary-button" onClick={() => setDialog({ open: true, location: null })}>
            <Icon name="pin" size={16} />
            Agregar local
          </button>
        }
      />
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
            <KpiCard label="Locales" value={list.length} explanation="Negocios registrados en tu comunidad." icon="pin" />
            <KpiCard label="Activos" value={activeCount} explanation="Locales que reciben clientes." icon="chart" />
            <KpiCard label="Clientes vinculados" value={linkedCustomers} explanation="Personas relacionadas con tus locales." icon="users" />
            <KpiCard label="Categorías" value={categories.size} explanation="Tipos de negocio que participan." icon="card" />
          </div>
          {list.length === 0 ? (
            <EmptyState message="Todavía no hay locales. Agrega el primero para comenzar." actionLabel="Agregar local" onAction={() => setDialog({ open: true, location: null })} />
          ) : (
            <div className="location-grid">
              {list.map(location => (
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
      <LocationDialog open={dialog.open} location={dialog.location} onClose={() => setDialog({ open: false, location: null })} onSaved={handleSaved} />
    </>
  );
}
