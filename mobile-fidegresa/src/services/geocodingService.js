import { create } from "axios";

const GEOCODER_URL = (process.env.EXPO_PUBLIC_GEOCODER_URL || "https://photon.komoot.io").replace(/\/+$/, "");

/** Cliente aparte: esta API externa no debe recibir el JWT del backend. */
const geocoderClient = create({ baseURL: GEOCODER_URL, timeout: 8000 });

/**
 * API externa (Photon / OpenStreetMap): convierte coordenadas en una dirección legible
 * para que el cajero confirme dónde está. Devuelve null si no hay resultado.
 */
export async function reverseGeocode({ latitude, longitude }, { signal } = {}) {
  const { data } = await geocoderClient.get("/reverse", { params: { lat: latitude, lon: longitude, lang: "default", limit: 1 }, signal });
  const properties = data?.features?.[0]?.properties;
  if (!properties) return null;
  const street = [properties.street ?? properties.name, properties.housenumber].filter(Boolean).join(" ");
  const area = properties.district ?? properties.locality ?? properties.city ?? "";
  return [street, area].filter(Boolean).join(", ") || null;
}
