import PropTypes from "prop-types";
import { Marker } from "react-map-gl/maplibre";

export function OtherBranchesLayer({ branches, selectedId }) {
  return branches.filter(branch => Number(branch.id) !== Number(selectedId)).map(branch => (
    <Marker key={branch.id} longitude={Number(branch.longitud)} latitude={Number(branch.latitud)} anchor="bottom">
      <span className="map-other-branch" title={branch.nombre} aria-label={`Otro local: ${branch.nombre}`}>◆</span>
    </Marker>
  ));
}

OtherBranchesLayer.propTypes = {
  branches: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.number, nombre: PropTypes.string, latitud: PropTypes.number, longitud: PropTypes.number })).isRequired,
  selectedId: PropTypes.number.isRequired
};
