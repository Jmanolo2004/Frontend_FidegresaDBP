import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import Map, { FullscreenControl, NavigationControl, Popup, ScaleControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import * as maplibregl from "maplibre-gl";
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import { Link } from "react-router-dom";
import { BranchMarker } from "./BranchMarker";
import { CustomerLayer } from "./CustomerLayer";
import { OtherBranchesLayer } from "./OtherBranchesLayer";
import { RadiusLayer } from "./RadiusLayer";
import { boundsForPoints, distanceInMeters, formatDistance } from "../../utils/mapUtils";

const LIGHT_STYLE = import.meta.env.VITE_MAP_STYLE_URL || "https://tiles.openfreemap.org/styles/liberty";
const DARK_STYLE = import.meta.env.VITE_MAP_DARK_STYLE_URL || "https://tiles.openfreemap.org/styles/dark";
const MAP_ATTRIBUTION = "© OpenStreetMap · OpenFreeMap";

// MapLibre busca su worker junto a su propio archivo; con Vite ese archivo se mueve y el mapa no carga.
// Le indicamos la ruta real del worker y le pasamos al mapa esta misma copia de MapLibre (mapLib),
// para que no cargue otra copia por su cuenta sin esa configuración.
maplibregl.setWorkerUrl(maplibreWorkerUrl);

function applyPalette(map, dark) {
  const styles = dark
    ? { background: "#28231f", water: "#343d40", park: "#34443a", road: "#65594f" }
    : { background: "#f7f3ee", water: "#dce7e5", park: "#e1eadf", road: "#e7d8c8" };
  map.getStyle()?.layers?.forEach(layer => {
    const id = layer.id.toLowerCase();
    const paint = layer.paint || {};
    const color = id.includes("water") ? styles.water : id.includes("park") || id.includes("grass") ? styles.park :
      id.includes("road") || id.includes("street") || id.includes("path") ? styles.road :
      id.includes("background") ? styles.background : null;
    if (!color) return;
    ["fill-color", "line-color", "background-color"].forEach(property => {
      if (paint[property] !== undefined) map.setPaintProperty(layer.id, property, color);
    });
  });
}

export function MapView({
  branch, branches, customers, radius, onBranchMove,
  onSelectAddress, onMapError, highlightedCustomerId, district, className = "", onViewportChange, ariaLabel = "Mapa de alcance de clientes en Lima"
}) {
  const mapRef = useRef(null);
  const mapLoaded = useRef(false);
  const warningTimer = useRef(null);
  const [mapError, setMapError] = useState(null);
  const [mapAttempt, setMapAttempt] = useState(0);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [viewport, setViewport] = useState({ longitude: branch.longitud, latitude: branch.latitud, zoom: 12.5 });
  const [dark, setDark] = useState(typeof document !== "undefined" && document.body.classList.contains("dark-theme"));
  const hoveredId = useRef(null);
  const center = useMemo(() => ({ lat: Number(branch.latitud), lng: Number(branch.longitud) }), [branch.latitud, branch.longitud]);
  const mappedCustomers = useMemo(() => customers.map(customer => ({
    ...customer,
    distance: Math.round(distanceInMeters(center, { lat: customer.latitud, lng: customer.longitud }))
  })), [customers, center]);

  useEffect(() => {
    const observer = new MutationObserver(() => setDark(document.body.classList.contains("dark-theme")));
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => window.clearTimeout(warningTimer.current), []);

  useEffect(() => {
    setViewport(previous => ({ ...previous, longitude: center.lng, latitude: center.lat }));
  }, [center]);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !map.getSource("geo-customers")) return;
    if (hoveredId.current !== null) map.setFeatureState({ source: "geo-customers", id: hoveredId.current }, { hover: false });
    if (highlightedCustomerId !== null && highlightedCustomerId !== undefined) {
      map.setFeatureState({ source: "geo-customers", id: Number(highlightedCustomerId) }, { hover: true });
      hoveredId.current = Number(highlightedCustomerId);
    } else {
      hoveredId.current = null;
    }
  }, [highlightedCustomerId, customers]);

  const onLoad = useCallback(event => {
    mapLoaded.current = true;
    window.clearTimeout(warningTimer.current);
    setMapError(null);
    applyPalette(event.target, dark);
    // Al abrir, encuadra el radio de alcance para que se vea quién queda dentro.
    const latDelta = (radius * 1.5) / 110540;
    const lngDelta = (radius * 1.5) / (111320 * Math.cos((center.lat * Math.PI) / 180));
    event.target.fitBounds([[center.lng - lngDelta, center.lat - latDelta], [center.lng + lngDelta, center.lat + latDelta]], { padding: 24, maxZoom: 16, duration: 0 });
    // Solo al cargar: después el usuario mueve el mapa a su gusto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dark]);
  const handleMapError = useCallback(event => {
    const message = event.error?.message || "No se pudo cargar el mapa.";
    const recoverable = Boolean(event.sourceId || event.tile || mapLoaded.current);
    setMapError({ message, recoverable });
    if (recoverable) {
      window.clearTimeout(warningTimer.current);
      warningTimer.current = window.setTimeout(() => setMapError(null), 8000);
    } else {
      onMapError?.(message);
    }
  }, [onMapError]);
  const moveTo = useCallback(position => {
    setViewport(previous => ({ ...previous, longitude: position.lng, latitude: position.lat }));
    mapRef.current?.jumpTo({ center: [position.lng, position.lat] });
  }, []);
  const centerMap = () => {
    const points = [center, ...mappedCustomers.map(customer => ({ lat: customer.latitud, lng: customer.longitud }))];
    const bounds = boundsForPoints(points);
    if (bounds) mapRef.current?.fitBounds(bounds, { padding: 48, maxZoom: 14, duration: 0 });
    else moveTo(center);
  };
  const handleClick = event => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    const features = map.queryRenderedFeatures(event.point, { layers: ["customer-clusters", "customer-points"] });
    const feature = features[0];
    if (!feature) {
      setSelectedCustomer(null);
      return;
    }
    if (feature.properties.cluster) {
      const source = map.getSource("geo-customers");
      source.getClusterExpansionZoom(feature.properties.cluster_id, (error, zoom) => {
        if (error) return;
        map.jumpTo({ center: feature.geometry.coordinates, zoom });
      });
      return;
    }
    setSelectedCustomer({
      ...feature.properties,
      longitude: feature.geometry.coordinates[0],
      latitude: feature.geometry.coordinates[1]
    });
  };
  const handleMove = event => {
    setViewport(event.viewState);
    const map = mapRef.current?.getMap();
    if (map) {
      const features = map.queryRenderedFeatures(event.point, { layers: ["customer-clusters", "customer-points"] });
      map.getCanvas().style.cursor = features.length ? "pointer" : "";
    }
  };
  const handleMoveEnd = event => onViewportChange?.({ longitude: event.viewState.longitude, latitude: event.viewState.latitude, zoom: event.viewState.zoom });

  return (
    <div className={`map-view ${className}`} role="region" aria-label={ariaLabel}>
        <Map
          ref={mapRef}
          key={mapAttempt}
          mapLib={maplibregl}
          {...viewport}
          onMove={handleMove}
          onMoveEnd={handleMoveEnd}
          onClick={handleClick}
          onLoad={onLoad}
          onError={handleMapError}
          mapStyle={dark ? DARK_STYLE : LIGHT_STYLE}
          attributionControl={{ compact: false, customAttribution: MAP_ATTRIBUTION }}
          maxBounds={[[-77.3, -12.45], [-76.65, -11.65]]}
          minZoom={9}
          maxZoom={19}
          style={{ width: "100%", height: "100%" }}
        >
          <RadiusLayer center={center} radius={radius} district={district} />
          <CustomerLayer customers={mappedCustomers} center={center} radius={radius} highlightedCustomerId={highlightedCustomerId} />
          <OtherBranchesLayer branches={branches} selectedId={Number(branch.id)} />
          <BranchMarker branch={branch} onDragEnd={onBranchMove} />
          {selectedCustomer && (
            <Popup longitude={selectedCustomer.longitude} latitude={selectedCustomer.latitude} onClose={() => setSelectedCustomer(null)} closeButton closeOnClick={false} anchor="bottom">
              <div className="map-customer-popup">
                <strong>{selectedCustomer.nombre}</strong>
                <span>{selectedCustomer.distrito} · {formatDistance(selectedCustomer.distance)}</span>
                <span>{selectedCustomer.visitas} visitas</span>
                <Link to={`/panel/clientes/${selectedCustomer.id}`}>Ver cliente</Link>
              </div>
            </Popup>
          )}
          <NavigationControl position="top-right" showCompass showZoom />
          <ScaleControl position="bottom-left" unit="metric" />
          <FullscreenControl position="top-right" />
          <div className="map-custom-controls">
            <button type="button" className="secondary-button" onClick={centerMap}>Centrar en mi local</button>
            {onSelectAddress && <button type="button" className="map-search-anchor" aria-label="Usa el buscador de dirección a la derecha" onClick={() => document.querySelector(".address-search input")?.focus()}>Buscar dirección</button>}
          </div>
        </Map>
      {mapError && (
        <div className={`map-load-warning${mapError.recoverable ? "" : " is-fatal"}`} role={mapError.recoverable ? "status" : "alert"}>
          <span>{mapError.recoverable ? "Algunas calles no se cargaron. Revisa tu conexión." : "No se pudo cargar el mapa real."}</span>
          {!mapError.recoverable && <button type="button" className="secondary-button" onClick={() => {
            mapLoaded.current = false;
            setMapError(null);
            setMapAttempt(previous => previous + 1);
          }}>Intentar de nuevo</button>}
        </div>
      )}
    </div>
  );
}

MapView.propTypes = {
  branch: PropTypes.shape({ id: PropTypes.number.isRequired, nombre: PropTypes.string.isRequired, latitud: PropTypes.number.isRequired, longitud: PropTypes.number.isRequired }).isRequired,
  branches: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.number, nombre: PropTypes.string, latitud: PropTypes.number, longitud: PropTypes.number })).isRequired,
  customers: PropTypes.arrayOf(PropTypes.object).isRequired,
  radius: PropTypes.number.isRequired,
  onBranchMove: PropTypes.func.isRequired,
  onSelectAddress: PropTypes.func,
  onMapError: PropTypes.func,
  highlightedCustomerId: PropTypes.number,
  district: PropTypes.string,
  className: PropTypes.string,
  onViewportChange: PropTypes.func,
  ariaLabel: PropTypes.string
};
