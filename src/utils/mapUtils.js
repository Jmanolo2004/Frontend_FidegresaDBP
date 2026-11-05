import circle from "@turf/circle";
import distance from "@turf/distance";
import { featureCollection, point } from "@turf/helpers";

export function distanceInMeters(from, to) {
  return distance(point([Number(from.lng), Number(from.lat)]), point([Number(to.lng), Number(to.lat)]), { units: "meters" });
}

export function isWithinRadius(center, target, radius) {
  return distanceInMeters(center, target) <= Number(radius);
}

export function createRadiusFeature(center, radius, properties = {}) {
  return circle([Number(center.lng), Number(center.lat)], Number(radius) / 1000, { steps: 64, units: "kilometers", properties });
}

export function createFeatureCollection(features = []) {
  return featureCollection(features);
}

export function boundsForPoints(points) {
  const coordinates = points.filter(item => Number.isFinite(Number(item.lng)) && Number.isFinite(Number(item.lat)));
  if (!coordinates.length) return null;
  const longitudes = coordinates.map(item => Number(item.lng));
  const latitudes = coordinates.map(item => Number(item.lat));
  return [[Math.min(...longitudes), Math.min(...latitudes)], [Math.max(...longitudes), Math.max(...latitudes)]];
}

export function formatDistance(meters) {
  const value = Number(meters);
  if (!Number.isFinite(value) || value < 0) return "0 m";
  if (value < 1000) return `${Math.round(value)} m`;
  return `${(value / 1000).toLocaleString("es-PE", { maximumFractionDigits: 1 })} km`;
}

export function districtBoundsFeature(district) {
  const centers = {
    Barranco: [-77.0218, -12.1451],
    Miraflores: [-77.0298, -12.1225],
    "San Isidro": [-77.0365, -12.0975],
    "San Borja": [-76.9993, -12.1014],
    "Santiago de Surco": [-76.9922, -12.1096]
  };
  const [lng, lat] = centers[district] || centers.Miraflores;
  const delta = 0.008;
  return {
    type: "Feature",
    properties: { district },
    geometry: {
      type: "Polygon",
      coordinates: [[[lng - delta, lat - delta], [lng + delta, lat - delta], [lng + delta, lat + delta], [lng - delta, lat + delta], [lng - delta, lat - delta]]]
    }
  };
}
