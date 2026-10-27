import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { Avatar } from "../../components/common/Avatar";
import { ErrorState } from "../../components/common/ErrorState";
import { Icon } from "../../components/common/Icon";
import { Skeleton } from "../../components/common/Skeleton";
import { LimaMap } from "../../components/geo/LimaMap";
import { AudienceDialog } from "../../components/geo/AudienceDialog";
import { useFetch } from "../../hooks/useFetch";
import { useDebounce } from "../../hooks/useDebounce";
import { useToast } from "../../hooks/useToast";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { geoService } from "../../services/geoService";
import { branchService } from "../../services/branchService";
import { computeReach, coordinatesFromMap, mapPositionFor } from "../../utils/geo";
import { pluralize } from "../../utils/format";

async function loadGeoData({ signal }) {
  const [branches, customers, settings] = await Promise.all([
    branchService.getAll({ signal }),
    geoService.getCustomers({ signal }),
    geoService.getSettings({ signal })
  ]);
  return { branches, customers, settings };
}

export default function GeolocationPage() {
  useDocumentTitle("Geolocalización");
  const { showToast, showError } = useToast();
  const { data, error, reload, setData } = useFetch(loadGeoData, []);
  const [radius, setRadius] = useState(500);
  const [audienceOpen, setAudienceOpen] = useState(false);
  const debouncedRadius = useDebounce(radius, 500);

  useEffect(() => {
    if (data?.settings) setRadius(Number(data.settings.radio));
    // Solo al cargar: después el radio se controla localmente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(data)]);

  useEffect(() => {
    if (!data || Number(data.settings.radio) === debouncedRadius) return;
    geoService
      .updateSettings({ radio: debouncedRadius })
      .then(settings => setData(current => ({ ...current, settings })))
      .catch(requestError => showError(requestError.message));
  }, [debouncedRadius, data, setData, showError]);

  const location = data?.branches.find(branch => Number(branch.id) === Number(data.settings.ubicacionId)) || data?.branches[0];
  const reach = useMemo(() => computeReach(location, data?.customers || [], radius), [location, data?.customers, radius]);

  if (error && !data) {
    return (
      <>
        <PageHeader title="Geolocalización" />
        <ErrorState error={error} onRetry={reload} />
      </>
    );
  }

  if (!data || !location) {
    return (
      <>
        <PageHeader title="Geolocalización" summary="Cargando el mapa de tus locales…" />
        <div className="geo-layout">
          <Skeleton height={520} radius={13} />
          <Skeleton height={520} radius={13} />
        </div>
      </>
    );
  }

  const updateBranch = changes =>
    setData(current => ({ ...current, branches: current.branches.map(branch => (branch.id === location.id ? { ...branch, ...changes } : branch)) }));

  const moveLocalPin = ({ x, y }) => updateBranch({ mapX: x, mapY: y, ...coordinatesFromMap(location.distrito, x, y) });

  const savePin = async ({ x, y }) => {
    moveLocalPin({ x, y });
    try {
      updateBranch(await branchService.updatePosition(location.id, { mapX: x, mapY: y }));
    } catch (requestError) {
      showError(requestError.message);
    }
  };

  const centerMap = async () => {
    const center = mapPositionFor(location.distrito);
    await savePin({ x: center.x, y: center.y });
    showToast(`Mapa centrado en ${location.nombre}.`);
  };

  const changeLocation = async event => {
    const ubicacionId = Number(event.target.value);
    const previous = data.settings;
    setData(current => ({ ...current, settings: { ...current.settings, ubicacionId } }));
    try {
      await geoService.updateSettings({ ubicacionId });
    } catch (requestError) {
      setData(current => ({ ...current, settings: previous }));
      showError(requestError.message);
    }
  };

  const { nearby, inRange, outOfRange } = reach;

  return (
    <>
      <PageHeader
        title="Geolocalización"
        summary={`${inRange.length} de ${nearby.length} clientes a ${radius} metros de ${location.nombre}.`}
        actions={
          <button className="primary-button" type="button" onClick={() => setAudienceOpen(true)}>
            <Icon name="users" size={16} />
            Crear Audiencia
          </button>
        }
      />
      <div className="geo-layout">
        <article className="panel map-panel">
          <LimaMap location={location} customers={nearby} radius={radius} onMove={moveLocalPin} onMoveEnd={savePin} onCenter={centerMap} />
        </article>
        <article className="panel geo-settings">
          <h2>Alcance de tu ubicación</h2>
          <p>Mueve el pin y ajusta el radio para explorar clientes cercanos en Lima.</p>
          <label htmlFor="geo-location">Ubicación del negocio</label>
          <select id="geo-location" className="form-control" value={location.id} onChange={changeLocation}>
            {data.branches.map(branch => (
              <option key={branch.id} value={branch.id}>
                {branch.nombre} · {branch.distrito}
              </option>
            ))}
          </select>
          <div className="range-value">
            <strong>{radius} m</strong>
            <span>Radio máximo: 1 km</span>
          </div>
          <input className="range-input" type="range" min={100} max={1000} step={50} value={radius} onChange={event => setRadius(Number(event.target.value))} aria-label="Radio de alcance en metros" />
          <div className="range-labels">
            <span>100 m</span>
            <span>500 m</span>
            <span>1.000 m</span>
          </div>
          <div className="geo-counts">
            <span>
              <strong>{inRange.length}</strong> Dentro del radio
            </span>
            <span>
              <strong>{outOfRange.length}</strong> Fuera del radio
            </span>
          </div>
          <div className="geo-audience-strip">
            <span>
              <Icon name="users" size={16} /> Audiencia potencial
            </span>
            <strong>{pluralize(inRange.length, "cliente", "clientes")}</strong>
            <small>
              en {location.distrito} dentro de {radius} m
            </small>
          </div>
          <div className="nearby-list">
            <strong className="panel-title">Clientes por distancia</strong>
            {nearby.length ? (
              nearby.map(person => (
                <div className={`nearby-row${person.distance <= radius ? " within-reach" : ""}`} key={person.id}>
                  <Avatar name={person.nombre} initials={person.iniciales} />
                  <div>
                    <strong>{person.nombre}</strong>
                    <small>
                      {person.distrito} · {person.distance <= radius ? "Dentro del radio" : "Fuera del radio"}
                    </small>
                  </div>
                  <span className="distance">{person.distance} m</span>
                </div>
              ))
            ) : (
              <p className="empty-state">No hay clientes para mostrar.</p>
            )}
          </div>
          <div className="geo-note">
            <span>
              <Icon name="target" size={16} />
            </span>
            <span>
              <b>Alcance por distrito.</b> Las distancias se calculan con la dirección registrada de cada cliente; no se rastrea su ubicación en tiempo real.
            </span>
          </div>
        </article>
      </div>
      <AudienceDialog open={audienceOpen} location={location} radius={radius} recipients={inRange} onClose={() => setAudienceOpen(false)} />
    </>
  );
}
