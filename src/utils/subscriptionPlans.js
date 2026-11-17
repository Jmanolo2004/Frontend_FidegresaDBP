export const SUBSCRIPTION_PLANS = [
  { id: "emprende", name: "Emprende", price: 39, maxLocations: 2 },
  { id: "crece", name: "Crece", price: 119, maxLocations: 5 },
  { id: "avanza", name: "Avanza", price: 229, maxLocations: 15 }
];

export function findSubscriptionPlan(value) {
  const key = String(value || "").toLowerCase();
  return SUBSCRIPTION_PLANS.find(plan => plan.id === key);
}
