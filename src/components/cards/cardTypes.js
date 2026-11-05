import { numberBetween, required } from "../../utils/validators";

export const CARD_TYPE_CONFIG = {
  Estampillas: {
    label: "Estampillas",
    icon: "star",
    component: "StampCardFront",
    description: "Premia las visitas y compras frecuentes.",
    ideal: "Cafeterías, restaurantes y comercios de visita recurrente.",
    example: "Junta 10 sellos y recibe un café gratis.",
    defaults: {
      sellosMeta: 10,
      premio: "Un café gratis",
      iconoSello: "star",
      selloPor: "visita",
      montoMinimo: 15,
      limitePorDia: 1
    },
    rules: {
      sellosMeta: [numberBetween(4, 12, "La meta debe tener entre 4 y 12 sellos.")],
      premio: [required("Escribe el premio de la tarjeta.")],
      montoMinimo: [numberBetween(0, 100000, "El monto mínimo debe ser igual o mayor que cero.")],
      limitePorDia: [numberBetween(1, 20, "El límite diario debe estar entre 1 y 20.")]
    }
  },
  Cashback: {
    label: "Cashback",
    icon: "reward",
    component: "CashbackCardFront",
    description: "Devuelve parte de cada compra como saldo.",
    ideal: "Restaurantes y tiendas con compras de distintos montos.",
    example: "Con 5% de cashback, una compra de S/ 40 devuelve S/ 2.00.",
    defaults: { porcentaje: 5, topeMensual: 100, saldoMinimoCanje: 10, expiraDias: 180 },
    rules: {
      porcentaje: [numberBetween(1, 30, "El cashback debe estar entre 1% y 30%.")],
      topeMensual: [numberBetween(0, 100000, "El tope debe ser igual o mayor que cero.")],
      saldoMinimoCanje: [numberBetween(0, 100000, "El saldo mínimo debe ser igual o mayor que cero.")],
      expiraDias: [numberBetween(1, 3650, "La vigencia debe estar entre 1 y 3650 días.")]
    }
  },
  Niveles: {
    label: "Niveles",
    icon: "users",
    component: "TierCardFront",
    description: "Desbloquea beneficios a medida que el cliente progresa.",
    ideal: "Negocios que buscan aumentar la frecuencia y el gasto.",
    example: "Al llegar a 300 puntos, el cliente desbloquea un beneficio Oro.",
    defaults: {
      niveles: [
        { nombre: "Bronce", desdePuntos: 0, beneficio: "Acceso al programa", color: "#b8794f" },
        { nombre: "Plata", desdePuntos: 100, beneficio: "5% de descuento", color: "#9da5ad" },
        { nombre: "Oro", desdePuntos: 300, beneficio: "Bebida de cortesía", color: "#d4a84e" }
      ],
      puntosPorSol: 1
    },
    rules: { puntosPorSol: [numberBetween(1, 1000, "Los puntos por sol deben estar entre 1 y 1000.")] }
  },
  Giftcard: {
    label: "Gift card",
    icon: "card",
    component: "GiftCardFront",
    description: "Ofrece saldo de regalo para compartir.",
    ideal: "Restaurantes, tiendas y experiencias para regalar.",
    example: "Regala una tarjeta de S/ 100 para disfrutar en el local.",
    defaults: {
      montos: [50, 100, 200],
      permiteMontoLibre: true,
      montoMin: 30,
      montoMax: 500,
      vigenciaMeses: 12,
      mensajeRegalo: "Un momento especial para ti"
    },
    rules: {
      montoMin: [numberBetween(1, 100000, "El monto mínimo debe ser mayor que cero.")],
      montoMax: [numberBetween(1, 100000, "El monto máximo debe ser mayor que cero.")],
      mensajeRegalo: [required("Escribe el mensaje de regalo.")]
    }
  }
};

export const CARD_TYPE_KEYS = Object.keys(CARD_TYPE_CONFIG);

export function createDefaultRules(type) {
  const defaults = CARD_TYPE_CONFIG[type]?.defaults;
  return defaults ? structuredClone(defaults) : {};
}

export function validateCardRules(type, rules) {
  const errors = {};
  const config = CARD_TYPE_CONFIG[type];
  if (!config) return { tipo: "Elige un tipo de tarjeta." };
  for (const [field, validators] of Object.entries(config.rules)) {
    const error = validators.map(validate => validate(rules[field])).find(Boolean);
    if (error) errors[field] = error;
  }
  if (type === "Estampillas" && !["visita", "compra mínima"].includes(rules.selloPor)) {
    errors.selloPor = "Elige cómo se entrega cada sello.";
  }
  if (type === "Niveles") {
    const levels = rules.niveles;
    if (!Array.isArray(levels) || levels.length < 3 || levels.length > 5) errors.niveles = "Define entre 3 y 5 niveles.";
    else {
      let previous = -1;
      levels.forEach((level, index) => {
        if (!String(level.nombre || "").trim() || !String(level.beneficio || "").trim()) errors.niveles = "Cada nivel necesita un nombre y un beneficio.";
        if (!Number.isInteger(Number(level.desdePuntos)) || Number(level.desdePuntos) < 0 || Number(level.desdePuntos) <= previous) {
          errors.niveles = "Los niveles deben ordenarse por puntos de menor a mayor.";
        }
        previous = Number(level.desdePuntos);
        if (!/^#[0-9a-f]{6}$/i.test(level.color || "")) errors.niveles = "Usa un color válido para cada nivel.";
        if (index === 0 && Number(level.desdePuntos) !== 0) errors.niveles = "El primer nivel debe comenzar en cero puntos.";
      });
    }
  }
  if (type === "Giftcard") {
    if (!Array.isArray(rules.montos) || rules.montos.length === 0) errors.montos = "Agrega al menos un monto.";
    else if (rules.montos.some(amount => !Number.isFinite(Number(amount)) || Number(amount) < 1)) errors.montos = "Los montos deben ser mayores que cero.";
    if (Number(rules.montoMax) < Number(rules.montoMin)) errors.montoMax = "El monto máximo no puede ser menor al mínimo.";
    if (!Number.isInteger(Number(rules.vigenciaMeses)) || Number(rules.vigenciaMeses) < 1 || Number(rules.vigenciaMeses) > 120) {
      errors.vigenciaMeses = "La vigencia debe estar entre 1 y 120 meses.";
    }
  }
  return errors;
}
