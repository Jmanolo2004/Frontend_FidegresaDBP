import { MAP_DISTRICTS, MAP_METERS_PER_UNIT } from "./constants";

export function mapPositionFor(district) {
  return MAP_DISTRICTS[district] || MAP_DISTRICTS.Miraflores;
}

export function coordinatesFromMap(district, mapX, mapY) {
  const origin = mapPositionFor(district);
  const longitudeScale = 111320 * Math.cos((origin.latitud * Math.PI) / 180);
  return {
    latitud: origin.latitud + ((origin.y - mapY) * MAP_METERS_PER_UNIT) / 111320,
    longitud: origin.longitud + ((mapX - origin.x) * MAP_METERS_PER_UNIT) / longitudeScale
  };
}

export function distanceInMeters(latitudeA, longitudeA, latitudeB, longitudeB) {
  const radians = degrees => (degrees * Math.PI) / 180;
  const lat1 = radians(Number(latitudeA) || 0);
  const lat2 = radians(Number(latitudeB) || 0);
  const latitudeDelta = lat2 - lat1;
  const longitudeDelta = radians((Number(longitudeB) || 0) - (Number(longitudeA) || 0));
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(longitudeDelta / 2) ** 2;
  const meters = 6371000 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return Math.max(50, Math.round(meters / 10) * 10);
}

export function clampMapPoint(value, min, max) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function computeReach(location, customers, radius) {
  if (!location) return { nearby: [], inRange: [], outOfRange: [] };
  const nearby = customers
    .map(person => ({
      ...person,
      distance: distanceInMeters(person.latitud, person.longitud, location.latitud, location.longitud)
    }))
    .sort((first, second) => first.distance - second.distance);
  return {
    nearby,
    inRange: nearby.filter(person => person.distance <= radius),
    outOfRange: nearby.filter(person => person.distance > radius)
  };
}
