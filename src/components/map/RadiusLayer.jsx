import PropTypes from "prop-types";
import { Layer, Source } from "react-map-gl/maplibre";
import { createRadiusFeature, districtBoundsFeature } from "../../utils/mapUtils";

export function RadiusLayer({ center, radius, district }) {
  const feature = district ? districtBoundsFeature(district) : createRadiusFeature(center, radius);
  return (
    <Source id="audience-zone" type="geojson" data={feature}>
      <Layer
        id="audience-zone-fill"
        type="fill"
        paint={{ "fill-color": "#c8894f", "fill-opacity": 0.15 }}
      />
      <Layer id="audience-zone-outline" type="line" paint={{ "line-color": "#c8894f", "line-width": 2 }} />
    </Source>
  );
}

RadiusLayer.propTypes = {
  center: PropTypes.shape({ lat: PropTypes.number.isRequired, lng: PropTypes.number.isRequired }).isRequired,
  radius: PropTypes.number.isRequired,
  district: PropTypes.string
};
