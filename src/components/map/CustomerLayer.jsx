import PropTypes from "prop-types";
import { Layer, Source } from "react-map-gl/maplibre";
import { useMemo } from "react";

export function CustomerLayer({ customers, center, radius, highlightedCustomerId }) {
  const data = useMemo(() => ({
    type: "FeatureCollection",
    features: customers.map(customer => ({
      type: "Feature",
      id: Number(customer.id),
      geometry: { type: "Point", coordinates: [Number(customer.longitud), Number(customer.latitud)] },
      properties: {
        id: customer.id,
        nombre: customer.nombre,
        distrito: customer.lastKnownZone || customer.distrito,
        distance: Number(customer.distance) || 0,
        visitas: Number(customer.visitas) || 0,
        inRadius: Number(customer.distance) <= radius,
        consentimientoUbicacion: Boolean(customer.consentimientoUbicacion),
        notificacionesActivas: Boolean(customer.notificacionesActivas)
      }
    }))
  }), [customers, radius]);
  return (
    <Source id="geo-customers" type="geojson" data={data} promoteId="id" cluster clusterMaxZoom={14} clusterRadius={46}>
      <Layer id="customer-clusters" type="circle" filter={["has", "point_count"]} paint={{
        "circle-color": "#c8894f",
        "circle-radius": ["step", ["get", "point_count"], 18, 8, 24, 20, 30],
        "circle-stroke-color": "#fff",
        "circle-stroke-width": 2
      }} />
      <Layer id="customer-cluster-count" type="symbol" filter={["has", "point_count"]} layout={{
        "text-field": "{point_count_abbreviated}",
        "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
        "text-size": 12
      }} paint={{ "text-color": "#fff" }} />
      <Layer id="customer-points" type="circle" filter={["!", ["has", "point_count"]]} paint={{
        "circle-color": ["case", ["==", ["get", "inRadius"], true], "#4e8066", "#9a9187"],
        "circle-radius": ["case", ["boolean", ["feature-state", "hover"], false], 11, 7],
        "circle-stroke-color": "#fff",
        "circle-stroke-width": 1.5
      }} />
    </Source>
  );
}

CustomerLayer.propTypes = {
  customers: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    nombre: PropTypes.string.isRequired,
    latitud: PropTypes.number.isRequired,
    longitud: PropTypes.number.isRequired,
    distance: PropTypes.number,
    visitas: PropTypes.number,
    distrito: PropTypes.string,
    consentimientoUbicacion: PropTypes.bool,
    notificacionesActivas: PropTypes.bool
  })).isRequired,
  center: PropTypes.shape({ lat: PropTypes.number, lng: PropTypes.number }).isRequired,
  radius: PropTypes.number.isRequired,
  highlightedCustomerId: PropTypes.number
};
