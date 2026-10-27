export const LOCALE = "es-PE";
export const CURRENCY = "PEN";

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
export const DEFAULT_PAGE_SIZE = 10;

export const DISTRICT_NAMES = ["Barranco", "Miraflores", "San Isidro", "San Borja", "Santiago de Surco"];

export const BUSINESS_CATEGORIES = ["Cafetería", "Restaurante", "Repostería", "Barbería", "Confitería", "Otro"];

export const CARD_TYPES = ["Estampillas", "Cashback", "Niveles", "Giftcard"];

export const CARD_TYPE_ICONS = {
  Estampillas: "star",
  Cashback: "reward",
  Niveles: "users",
  Giftcard: "card"
};

export const MAP_METERS_PER_UNIT = 2.5;

export const MAP_DISTRICTS = {
  Barranco: { x: 300, y: 555, latitud: -12.1451, longitud: -77.0218 },
  Miraflores: { x: 410, y: 325, latitud: -12.1225, longitud: -77.0298 },
  "San Isidro": { x: 625, y: 245, latitud: -12.0975, longitud: -77.0365 },
  "San Borja": { x: 585, y: 455, latitud: -12.1014, longitud: -76.9993 },
  "Santiago de Surco": { x: 735, y: 535, latitud: -12.1096, longitud: -76.9922 }
};

export const NOTICE_PREFERENCES = [
  { key: "inactivos", label: "Clientes inactivos", description: "Avisar si pasan más de 60 días sin una visita." },
  { key: "localesEnPausa", label: "Locales en pausa", description: "Avisar cuando haya locales que no reciben clientes." },
  { key: "resenas", label: "Reseñas pendientes", description: "Avisar cuando haya reseñas sin responder." },
  { key: "cumpleanos", label: "Cumpleaños próximos", description: "Avisar sobre cumpleaños durante los próximos 7 días." }
];
