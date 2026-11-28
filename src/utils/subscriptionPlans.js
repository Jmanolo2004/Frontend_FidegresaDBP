// Mismo catálogo que el backend (Plans.java). Precios en soles al mes; Avanza no tiene tope de locales.
export const SUBSCRIPTION_PLANS = [
  { id: "emprende", name: "Emprende", price: 29, maxLocations: 1, locationsLabel: "1 sucursal" },
  { id: "crece", name: "Crece", price: 49, maxLocations: 2, locationsLabel: "2 sucursales, ampliables" },
  { id: "avanza", name: "Avanza", price: 99, maxLocations: Infinity, locationsLabel: "Varias sucursales" }
];

/** "1 local", "2 locales" o "locales ilimitados", para los mensajes del panel. */
export function locationsLimitText(plan) {
  if (!Number.isFinite(plan.maxLocations)) return "locales ilimitados";
  return plan.maxLocations === 1 ? "1 local" : `${plan.maxLocations} locales`;
}

export function findSubscriptionPlan(value) {
  const key = String(value || "").toLowerCase();
  return SUBSCRIPTION_PLANS.find(plan => plan.id === key);
}
