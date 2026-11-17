import { getDatabase, saveDatabase } from "../database";
import { badRequest, HttpError, respond } from "../http";
import { findSubscriptionPlan, SUBSCRIPTION_PLANS } from "../../utils/subscriptionPlans";

export function currentDemoPlan(db) {
  const plan = findSubscriptionPlan(db.configuracion.plan || "Emprende");
  if (!plan) throw new HttpError(500, "El plan de demostración no es válido.");
  return plan;
}

export function assertLocationCapacity(db, plan = currentDemoPlan(db)) {
  if (db.ubicaciones.length >= plan.maxLocations) {
    const nextStep = plan === SUBSCRIPTION_PLANS[SUBSCRIPTION_PLANS.length - 1]
      ? "Es el plan máximo disponible."
      : "Mejora tu plan en Configuración.";
    throw new HttpError(422, `Límite de locales alcanzado: ${plan.name} permite hasta ${plan.maxLocations}. ${nextStep}`);
  }
}

export const subscriptionHandlers = [
  {
    method: "post",
    path: "/demo/subscription/upgrade",
    auth: true,
    handler: ({ body, user }) => {
      if (!user || !["ADMIN", "BRAND_ADMIN"].includes(user.role)) {
        throw new HttpError(403, "Solo una cuenta administradora puede mejorar el plan.");
      }
      const db = getDatabase();
      const current = currentDemoPlan(db);
      const next = SUBSCRIPTION_PLANS[SUBSCRIPTION_PLANS.indexOf(current) + 1];
      if (!next || body.planId !== next.id) throw badRequest("Selecciona la siguiente mejora disponible.");
      if (body.confirmed !== true) throw badRequest("Confirma el pago simulado para continuar.");
      const previous = db.configuracion.plan;
      db.configuracion.plan = next.name;
      if (!saveDatabase()) {
        db.configuracion.plan = previous;
        throw new HttpError(500, "No se pudo guardar la suscripción de demostración.");
      }
      return respond({ plan: next.name });
    }
  }
];
