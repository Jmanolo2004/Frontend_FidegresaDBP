import { formatMoney } from "../../utils/format";

// Valores de ejemplo de la tarjeta de prueba (los mismos que muestra la vista previa del panel).
const SAMPLE = { stamps: 6, cashbackBalance: 24.5, points: 180 };

function currentLevel(levels, points) {
  return levels.reduce((found, level) => (points >= Number(level.desdePuntos || 0) ? level : found), levels[0]);
}

/** Dos datos que se ven en el frente del pase según el tipo de programa. */
export function walletFields(card) {
  const rules = card.reglas || {};
  if (card.tipo === "Estampillas") {
    return [
      { etiqueta: "Sellos", valor: `${SAMPLE.stamps} / ${rules.sellosMeta || 10}` },
      { etiqueta: "Premio", valor: rules.premio || "Recompensa" }
    ];
  }
  if (card.tipo === "Cashback") {
    return [
      { etiqueta: "Saldo", valor: formatMoney(SAMPLE.cashbackBalance) },
      { etiqueta: "Cashback", valor: `${rules.porcentaje || 0}% por compra` }
    ];
  }
  if (card.tipo === "Niveles") {
    const levels = rules.niveles?.length ? rules.niveles : [{ nombre: "Nivel 1", desdePuntos: 0 }];
    return [
      { etiqueta: "Nivel", valor: currentLevel(levels, SAMPLE.points)?.nombre || "Nivel 1" },
      { etiqueta: "Puntos", valor: String(SAMPLE.points) }
    ];
  }
  const amounts = rules.montos?.length ? rules.montos : [100];
  return [
    { etiqueta: "Saldo", valor: formatMoney(amounts[Math.min(1, amounts.length - 1)]) },
    { etiqueta: "Vigencia", valor: `${rules.vigenciaMeses || card.vigenciaMeses || 12} meses` }
  ];
}

export function buildWalletPass(card, { client, detail }) {
  return {
    tipo: card.tipo,
    nombre: card.nombre,
    negocio: card.negocio,
    color: card.colores?.primario || card.color,
    logo: card.imagen || null,
    portada: card.portada || null,
    cliente: client,
    campos: walletFields(card),
    detalle: detail
  };
}
