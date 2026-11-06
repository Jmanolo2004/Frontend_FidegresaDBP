import { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Avatar } from "../../components/common/Avatar";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { EmptyState } from "../../components/common/EmptyState";
import { ErrorState } from "../../components/common/ErrorState";
import { Icon } from "../../components/common/Icon";
import { KpiCard } from "../../components/common/KpiCard";
import { PageHeader } from "../../components/common/PageHeader";
import { Pagination } from "../../components/common/Pagination";
import { Skeleton } from "../../components/common/Skeleton";
import { AddressSearch } from "../../components/map/AddressSearch";
import { GeoMap } from "../../components/map/GeoMap";
import { useDebounce } from "../../hooks/useDebounce";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useFetch } from "../../hooks/useFetch";
import { usePagination } from "../../hooks/usePagination";
import { useToast } from "../../hooks/useToast";
import { audienceService } from "../../services/audienceService";
import { branchService } from "../../services/branchService";
import { geoService } from "../../services/geoService";
import { distanceInMeters, formatDistance } from "../../utils/mapUtils";

const CARD_TYPES = ["Estampillas", "Cashback", "Niveles", "Giftcard"];
const STATUS_OPTIONS = ["Borrador", "Programada", "Activa", "Pausada", "Finalizada"];

function loadGeoSettings({ signal }) {
  return Promise.all([branchService.getAll({ signal }), geoService.getSettings({ signal })]).then(([branches, settings]) => ({ branches, settings }));
}

function daysSince(date) {
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
}

function loadAudienceList({ signal, page, size, status, q }) {
  return audienceService.getAll({ page, size, status, q }, { signal });
}

function AudienceTable({ page, rows, pagination, onDuplicate, onStatus, onDelete }) {
  if (!rows.length) {
    return <EmptyState message="Aún no tienes audiencias. Crea una audiencia para configurar una zona, definir el segmento y programar avisos." />;
  }
  return (
    <div className="panel audience-table-panel">
      <div className="table-wrap">
        <table className="data-table audience-table">
          <thead><tr><th>Audiencia</th><th>Local y zona</th><th>Personas</th><th>Estado</th><th>Último envío</th><th>Acciones</th></tr></thead>
          <tbody>
            {rows.map(audience => (
              <tr key={audience.id}>
                <td><strong>{audience.nombre}</strong><small>{audience.trigger === "scheduled" ? "Envío programado" : "Al entrar a la zona"}</small></td>
                <td>{audience.local}<small>{audience.zoneType === "district" ? audience.district : `${audience.radius} m`}</small></td>
                <td>{audience.personas || 0}</td>
                <td><span className={`status-pill ${audience.estado.toLowerCase()}`}>{audience.estado}</span></td>
                <td>{audience.ultimoEnvio ? new Date(audience.ultimoEnvio).toLocaleString("es-PE") : "Sin envíos"}</td>
                <td>
                  <div className="audience-row-actions">
                    <Link className="text-button" to={`/panel/geolocalizacion/audiencias/${audience.id}`}>Ver</Link>
                    <Link className="text-button" to={`/panel/geolocalizacion/audiencias/${audience.id}/editar`}>Editar</Link>
                    <button className="text-button" type="button" onClick={() => onDuplicate(audience)}>Duplicar</button>
                    <button className="text-button" type="button" onClick={() => onStatus(audience, audience.estado === "Activa" ? "Pausada" : "Activa")}>{audience.estado === "Activa" ? "Pausar" : "Activar"}</button>
                    <button className="text-button danger-text" type="button" onClick={() => onDelete(audience)}>Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page.page} totalPages={pagination.totalPages} totalElements={pagination.totalElements} size={pagination.size} onPageChange={pagination.setPage} onSizeChange={pagination.setSize} itemLabel="audiencias" />
    </div>
  );
}

AudienceTable.propTypes = {
  page: PropTypes.object.isRequired,
  rows: PropTypes.array.isRequired,
  pagination: PropTypes.object.isRequired,
  onDuplicate: PropTypes.func.isRequired,
  onStatus: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired
};

function AudienceView({ branches, showToast, showError }) {
  const navigate = useNavigate();
  const pagination = usePagination({ status: "", q: "" });
  const debouncedQuery = useDebounce(pagination.filters.q, 350);
  const fetchAudiences = useCallback(({ signal }) => loadAudienceList({
    signal,
    page: pagination.page,
    size: pagination.size,
    status: pagination.filters.status,
    q: debouncedQuery
  }), [pagination.page, pagination.size, pagination.filters.status, debouncedQuery]);
  const { data, error, reload } = useFetch(fetchAudiences, [pagination.page, pagination.size, pagination.filters.status, debouncedQuery]);
  const allAudiencesFetch = useCallback(({ signal }) => audienceService.getAll({ page: 0, size: 100 }, { signal }), []);
  const { data: allData } = useFetch(allAudiencesFetch, []);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const all = allData?.content || [];
  const active = all.filter(item => item.estado === "Activa");
  const reach = all.filter(item => item.estado === "Activa" || item.estado === "Programada").reduce((sum, item) => sum + Number(item.personas || 0), 0);
  const sentLast30 = all.flatMap(item => item.envios || []).filter(item => Date.now() - new Date(item.fecha).getTime() <= 30 * 86400000).length;
  const attributedVisits = all.flatMap(item => item.envios || []).filter(item => item.volvio && Date.now() - new Date(item.fecha).getTime() <= 32 * 86400000).length;

  const perform = async callback => {
    try {
      await callback();
      await reload();
    } catch (requestError) {
      showError(requestError.message);
    }
  };
  const duplicate = audience => perform(async () => {
    const copy = await audienceService.duplicate(audience.id);
    showToast("Se creó un borrador duplicado.");
    navigate(`/panel/geolocalizacion/audiencias/${copy.id}/editar`);
  });
  const statusChange = (audience, status) => perform(async () => {
    await audienceService.setStatus(audience.id, status);
    showToast(status === "Activa" ? "La audiencia está activa." : "La audiencia está pausada.");
  });
  const remove = () => perform(async () => {
    await audienceService.remove(deleteTarget.id);
    setDeleteTarget(null);
    showToast("Audiencia eliminada.");
  });

  return (
    <>
      <div className="audience-kpis">
        <KpiCard label="Audiencias activas" value={active.length} icon="users" />
        <KpiCard label="Personas alcanzables" value={reach} icon="target" />
        <KpiCard label="Avisos en 30 días" value={sentLast30} icon="bell" />
        <KpiCard label="Visitas atribuidas" value={attributedVisits} icon="visits" />
      </div>
      <div className="audience-toolbar">
        <div className="audience-filters">
          <input className="search-input" type="search" placeholder="Buscar por nombre o local" aria-label="Buscar audiencias" value={pagination.filters.q} onChange={event => pagination.setFilter("q", event.target.value)} />
          <select className="filter-select" aria-label="Filtrar por estado" value={pagination.filters.status} onChange={event => pagination.setFilter("status", event.target.value)}>
            <option value="">Todos los estados</option>{STATUS_OPTIONS.map(status => <option key={status} value={status}>{status}</option>)}
          </select>
        </div>
        <Link className="primary-button" to="/panel/geolocalizacion/audiencias/nueva"><Icon name="plus" size={15} /> Crear audiencia</Link>
      </div>
      {error && !data ? <ErrorState error={error} onRetry={reload} /> : !data ? <Skeleton height={380} /> : (
        <AudienceTable page={pagination} rows={data.content} pagination={{ ...data, setPage: pagination.setPage, setSize: pagination.setSize }} onDuplicate={duplicate} onStatus={statusChange} onDelete={setDeleteTarget} />
      )}
      <ConfirmDialog open={Boolean(deleteTarget)} title="Eliminar audiencia" description={deleteTarget ? `¿Quieres eliminar “${deleteTarget.nombre}”?` : ""} confirmLabel="Eliminar audiencia" onClose={() => setDeleteTarget(null)} onConfirm={remove} />
      <span className="sr-only">{branches.length} locales disponibles</span>
    </>
  );
}

AudienceView.propTypes = {
  branches: PropTypes.array.isRequired,
  showToast: PropTypes.func.isRequired,
  showError: PropTypes.func.isRequired
};

export default function GeolocationPage() {
  useDocumentTitle("Geolocalización");
  const navigate = useNavigate();
  const { showToast, showError } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get("vista") === "audiencias" ? "audiencias" : "mapa";
  const { data: base, error: baseError, reload: reloadBase, setData } = useFetch(loadGeoSettings, []);
  const [radius, setRadius] = useState(500);
  const [quickActivity, setQuickActivity] = useState("todos");
  const [quickCardType, setQuickCardType] = useState("Todas");
  const [highlightedCustomerId, setHighlightedCustomerId] = useState(null);
  const branchId = base?.settings.ubicacionId;
  const customersFetch = useCallback(({ signal }) => branchId ? geoService.getCustomers({ branchId }, { signal }) : Promise.resolve([]), [branchId]);
  const { data: customersData } = useFetch(customersFetch, [branchId], { enabled: Boolean(branchId) });
  const location = base?.branches.find(branch => Number(branch.id) === Number(branchId)) || base?.branches[0];
  const customers = customersData || [];

  useEffect(() => {
    if (base?.settings) setRadius(Number(base.settings.radio));
  }, [base?.settings]);

  const currentCenter = useMemo(() => location ? ({ lat: Number(location.latitud), lng: Number(location.longitud) }) : null, [location]);
  const nearby = useMemo(() => {
    if (!currentCenter) return [];
    return customers.map(customer => ({ ...customer, distance: Math.round(distanceInMeters(currentCenter, { lat: customer.latitud, lng: customer.longitud })) }))
      .sort((first, second) => first.distance - second.distance);
  }, [customers, currentCenter]);
  const quickSegment = useCallback(customer => {
    const inactiveDays = daysSince(customer.ultimaVisita);
    if (quickActivity === "activos" && inactiveDays > 60) return false;
    if (quickActivity === "inactivos60" && inactiveDays <= 60) return false;
    if (quickActivity === "cumpleanos" && Number(customer.cumpleanos?.split("/")[1]) !== new Date().getMonth() + 1) return false;
    if (quickCardType !== "Todas" && customer.tipoTarjeta !== quickCardType) return false;
    return true;
  }, [quickActivity, quickCardType]);
  const filteredNearby = nearby.filter(quickSegment);
  const inside = filteredNearby.filter(person => person.distance <= radius);
  const outside = filteredNearby.filter(person => person.distance > radius);
  const reachable = inside.filter(person => person.consentimientoUbicacion && person.notificacionesActivas);
  const consented = inside.filter(person => person.consentimientoUbicacion).length;
  const debouncedRadius = useDebounce(radius, 500);

  useEffect(() => {
    if (!base?.settings || Number(base.settings.radio) === debouncedRadius) return;
    geoService.updateSettings({ radio: debouncedRadius }).then(settings => {
      setData(current => ({ ...current, settings }));
    }).catch(requestError => showError(requestError.message));
  }, [base?.settings, debouncedRadius, setData, showError]);

  const updateBranchLocal = position => setData(current => ({
    ...current,
    branches: current.branches.map(branch => Number(branch.id) === Number(location.id) ? { ...branch, latitud: position.lat, longitud: position.lng } : branch)
  }));
  const saveBranchPosition = async position => {
    const previous = { lat: Number(location.latitud), lng: Number(location.longitud) };
    updateBranchLocal(position);
    try {
      const saved = await geoService.updatePosition(location.id, { latitud: Number(position.lat), longitud: Number(position.lng) });
      setData(current => ({ ...current, branches: current.branches.map(branch => Number(branch.id) === Number(saved.id) ? { ...branch, ...saved } : branch) }));
      showToast(`Ubicación de ${location.nombre} actualizada.`);
    } catch (requestError) {
      updateBranchLocal(previous);
      showError(requestError.message);
    }
  };
  const changeLocation = async event => {
    const nextId = Number(event.target.value);
    const previousId = Number(location.id);
    setData(current => ({ ...current, settings: { ...current.settings, ubicacionId: nextId } }));
    try {
      await geoService.updateSettings({ ubicacionId: nextId });
    } catch (requestError) {
      setData(current => ({ ...current, settings: { ...current.settings, ubicacionId: previousId } }));
      showError(requestError.message);
    }
  };
  const changeTab = next => {
    setSearchParams(previous => {
      const params = new URLSearchParams(previous);
      if (next === "mapa") params.delete("vista");
      else params.set("vista", next);
      params.delete("page");
      return params;
    });
  };
  const toAudienceWizard = () => {
    const params = new URLSearchParams({ branchId: String(location.id), lat: String(location.latitud), lng: String(location.longitud), radius: String(radius) });
    navigate(`/panel/geolocalizacion/audiencias/nueva?${params}`);
  };

  if (baseError && !base) return <><PageHeader title="Geolocalización" /><ErrorState error={baseError} onRetry={reloadBase} /></>;
  if (!base || !location) return <><PageHeader title="Geolocalización" summary="Cargando locales y zonas de alcance…" /><Skeleton height={520} radius={13} /></>;

  const mapLatitude = Number(location.latitud);
  const mapLongitude = Number(location.longitud);
  const mapBbox = `${mapLongitude - 0.035},${mapLatitude - 0.025},${mapLongitude + 0.035},${mapLatitude + 0.025}`;
  const realMapFallback = (
    <div className="geo-real-map-fallback">
      <iframe
        title={`Mapa real de ${location.nombre}, ${location.distrito}, Lima`}
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(mapBbox)}&layer=mapnik&marker=${mapLatitude}%2C${mapLongitude}`}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
      <p>{location.direccion} · {location.distrito}, Lima</p>
    </div>
  );

  return (
    <>
      <PageHeader title="Geolocalización" summary={view === "mapa" ? `${reachable.length} clientes alcanzables dentro de ${radius} m de ${location.nombre}.` : "Segmenta clientes por zona y perfil, y programa notificaciones para tu app móvil."} actions={view === "mapa" ? <button className="primary-button" type="button" onClick={toAudienceWizard}><Icon name="users" size={16} /> Crear audiencia con esta zona</button> : null} />
      <div className="geo-view-tabs" role="tablist" aria-label="Vistas de geolocalización">
        <button type="button" role="tab" aria-selected={view === "mapa"} className={view === "mapa" ? "selected" : ""} onClick={() => changeTab("mapa")}>Mapa de alcance</button>
        <button type="button" role="tab" aria-selected={view === "audiencias"} className={view === "audiencias" ? "selected" : ""} onClick={() => changeTab("audiencias")}>Audiencias</button>
      </div>
      {view === "audiencias" ? (
        <AudienceView branches={base.branches} showToast={showToast} showError={showError} />
      ) : (
        <>
          <div className="geo-layout geo-map-layout">
            <article className="panel map-panel geo-map-panel">
              <GeoMap
                branch={location}
                branches={base.branches}
                customers={nearby}
                radius={radius}
                highlightedCustomerId={highlightedCustomerId || undefined}
                onBranchMove={position => saveBranchPosition({ lat: Number(position.lat), lng: Number(position.lng) })}
                className="geo-main-map"
                ariaLabel="Mapa interactivo con el alcance del local y clientes cercanos"
                fallback={realMapFallback}
              />
            </article>
            <aside className="panel geo-settings">
              <h2>Zona y segmento</h2>
              <p>Ajusta el local y el radio para calcular quién podría recibir el aviso.</p>
              <label htmlFor="geo-location">Local</label>
              <select id="geo-location" className="form-control" value={location.id} onChange={changeLocation}>
                {base.branches.map(branch => <option key={branch.id} value={branch.id}>{branch.nombre} · {branch.distrito}</option>)}
              </select>
              <AddressSearch onSelect={position => saveBranchPosition(position)} />
              <div className="range-value"><strong>{radius >= 1000 ? `${(radius / 1000).toLocaleString("es-PE")} km` : `${radius} m`}</strong><span>100 m – 3 km</span></div>
              <input className="range-input" type="range" min={100} max={3000} step={50} value={radius} onChange={event => setRadius(Number(event.target.value))} aria-label="Radio de alcance en metros" />
              <div className="geo-radius-presets">{[300, 500, 1000, 2000].map(value => <button key={value} type="button" className={radius === value ? "selected" : ""} onClick={() => setRadius(value)}>{value >= 1000 ? `${value / 1000} km` : `${value} m`}</button>)}</div>
              <div className="geo-quick-filters">
                <label>Actividad<select className="filter-select" value={quickActivity} onChange={event => setQuickActivity(event.target.value)}><option value="todos">Todos</option><option value="activos">Activos (60 días)</option><option value="inactivos60">Inactivos +60 días</option><option value="cumpleanos">Cumpleaños este mes</option></select></label>
                <label>Tipo de tarjeta<select className="filter-select" value={quickCardType} onChange={event => setQuickCardType(event.target.value)}><option>Todas</option>{CARD_TYPES.map(type => <option key={type}>{type}</option>)}</select></label>
              </div>
              <div className="geo-counts">
                <span><strong>{inside.length}</strong> Dentro del radio</span><span><strong>{outside.length}</strong> Fuera del radio</span>
              </div>
              <div className="geo-counts geo-counts-privacy">
                <span><strong>{consented}</strong> Aceptaron compartir ubicación</span><span><strong>{reachable.length}</strong> Audiencia alcanzable</span>
              </div>
              <div className="geo-privacy-note"><Icon name="target" size={16} /><span><b>Privacidad · Ley N° 29733</b><br />Solo se notifica a clientes que aceptaron compartir su ubicación. Fidegresa no rastrea a las personas desde la web.</span></div>
              <div className="nearby-list" tabIndex={0} aria-label="Clientes por distancia, lista alternativa al mapa">
                <strong className="panel-title">Clientes por distancia</strong>
                {filteredNearby.length ? filteredNearby.map(person => (
                  <Link key={person.id} to={`/panel/clientes/${person.id}`} className={`nearby-row${person.distance <= radius ? " within-reach" : ""}`} onMouseEnter={() => setHighlightedCustomerId(person.id)} onMouseLeave={() => setHighlightedCustomerId(null)} onFocus={() => setHighlightedCustomerId(person.id)} onBlur={() => setHighlightedCustomerId(null)}>
                    <Avatar name={person.nombre} initials={person.iniciales} />
                    <span><strong>{person.nombre}</strong><small>{person.lastKnownZone} · {person.consentimientoUbicacion && person.notificacionesActivas ? "Puede recibir avisos" : "Avisos desactivados"}</small></span>
                    <span className="distance">{formatDistance(person.distance)}</span>
                  </Link>
                )) : <p className="empty-state">No hay clientes que coincidan con estos filtros.</p>}
              </div>
            </aside>
          </div>
          <AudienceViewActions location={location} radius={radius} reachable={reachable.length} />
        </>
      )}
      <span className="sr-only">{highlightedCustomerId ? `Cliente ${highlightedCustomerId} resaltado en el mapa.` : ""}</span>
    </>
  );
}

function AudienceViewActions({ location, radius, reachable }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  if (searchParams.get("vista") === "audiencias") return null;
  const params = new URLSearchParams({ branchId: String(location.id), lat: String(location.latitud), lng: String(location.longitud), radius: String(radius) });
  return <div className="geo-create-audience-footer"><span>{reachable} clientes cumplen los filtros y pueden recibir avisos.</span><button type="button" className="primary-button" onClick={() => navigate(`/panel/geolocalizacion/audiencias/nueva?${params}`)}>Continuar a Crear audiencia</button></div>;
}

AudienceViewActions.propTypes = {
  location: PropTypes.object.isRequired,
  radius: PropTypes.number.isRequired,
  reachable: PropTypes.number.isRequired
};
