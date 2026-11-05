import PropTypes from "prop-types";
import { Layer, Source } from "react-map-gl/maplibre";
import { useMemo } from "react";

export function HeatmapLayer({ points, visible }) {
  const data = useMemo(() => ({
    type: "FeatureCollection",
    features: points.map(item => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [Number(item.lng), Number(item.lat)] },
      properties: { weight: Number(item.weight) || 1 }
    }))
  }), [points]);
  if (!visible) return null;
  return (
    <Source id="visit-heatmap" type="geojson" data={data}>
      <Layer id="visit-heatmap-layer" type="heatmap" paint={{
        "heatmap-weight": ["interpolate", ["linear"], ["get", "weight"], 0, 0, 10, 1],
        "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 8, 0.6, 15, 2],
        "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 8, 14, 15, 40],
        "heatmap-opacity": 0.65,
        "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], 0, "rgba(200,137,79,0)", 0.25, "#e5bd93", 0.55, "#c8894f", 0.85, "#603f2a"]
      }} />
    </Source>
  );
}

HeatmapLayer.propTypes = {
  points: PropTypes.arrayOf(PropTypes.shape({ lat: PropTypes.number, lng: PropTypes.number, weight: PropTypes.number })).isRequired,
  visible: PropTypes.bool.isRequired
};
