import PropTypes from "prop-types";
import { Marker } from "react-map-gl/maplibre";

const KEY_DISTANCE_METERS = 25;

function moveByMeters(position, direction) {
  const latitude = position.lat + (direction.lat * KEY_DISTANCE_METERS) / 111320;
  const longitude = position.lng + (direction.lng * KEY_DISTANCE_METERS) / (111320 * Math.cos((position.lat * Math.PI) / 180));
  return { lat: latitude, lng: longitude };
}

export function BranchMarker({ branch, onDragEnd }) {
  const position = { lat: Number(branch.latitud), lng: Number(branch.longitud) };
  const handleKeyDown = event => {
    const directions = {
      ArrowUp: { lat: 1, lng: 0 },
      ArrowDown: { lat: -1, lng: 0 },
      ArrowRight: { lat: 0, lng: 1 },
      ArrowLeft: { lat: 0, lng: -1 }
    };
    if (!directions[event.key]) return;
    event.preventDefault();
    onDragEnd(moveByMeters(position, directions[event.key]));
  };

  return (
    <Marker longitude={position.lng} latitude={position.lat} draggable onDragEnd={event => onDragEnd(event.lngLat)} anchor="bottom">
      <button type="button" className="map-branch-marker" aria-label={`Pin de ${branch.nombre}. Arrastra o usa las flechas para moverlo 25 metros.`} onKeyDown={handleKeyDown}>
        <span aria-hidden="true">●</span>
      </button>
    </Marker>
  );
}

BranchMarker.propTypes = {
  branch: PropTypes.shape({ nombre: PropTypes.string.isRequired, latitud: PropTypes.number.isRequired, longitud: PropTypes.number.isRequired }).isRequired,
  onDragEnd: PropTypes.func.isRequired
};
