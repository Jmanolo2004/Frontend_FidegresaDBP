const EARTH_RADIUS_METERS = 6371000;
const toRadians = degrees => (degrees * Math.PI) / 180;

/** Distancia en metros entre dos coordenadas (fórmula de haversine). */
export function distanceInMeters(from, to) {
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(a));
}

/** El local más cercano a la posición, con su distancia; null si no hay locales con coordenadas. */
export function findNearestBranch(position, branches) {
  let nearest = null;
  for (const branch of branches) {
    if (!Number.isFinite(branch.latitude) || !Number.isFinite(branch.longitude)) continue;
    const distance = distanceInMeters(position, branch);
    if (!nearest || distance < nearest.distance) nearest = { branch, distance };
  }
  return nearest;
}
