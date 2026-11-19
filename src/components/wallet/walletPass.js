import { formatMoney } from "../../utils/format";

// Una tarjeta nueva siempre empieza en cero: sin sellos, sin saldo de cashback y sin puntos.
const NEW_CARD = { stamps: 0, cashbackBalance: 0, points: 0 };

function currentLevel(levels, points) {
  return levels.reduce((found, level) => (points >= Number(level.desdePuntos || 0) ? level : found), levels[0]);
}

/** Dos datos que se ven en el frente del pase según el tipo de programa. */
export function walletFields(card, issued = null) {
  const rules = card.reglas || {};
  if (issued) return issuedFields(card, issued);
  if (card.tipo === "Estampillas") {
    return [
      { etiqueta: "Sellos", valor: `${NEW_CARD.stamps} / ${rules.sellosMeta || 10}` },
      { etiqueta: "Premio", valor: rules.premio || "Recompensa" }
    ];
  }
  if (card.tipo === "Cashback") {
    return [
      { etiqueta: "Saldo", valor: formatMoney(NEW_CARD.cashbackBalance) },
      { etiqueta: "Cashback", valor: `${rules.porcentaje || 0}% por compra` }
    ];
  }
  if (card.tipo === "Niveles") {
    const levels = rules.niveles?.length ? rules.niveles : [{ nombre: "Nivel 1", desdePuntos: 0 }];
    return [
      { etiqueta: "Nivel", valor: currentLevel(levels, NEW_CARD.points)?.nombre || "Nivel 1" },
      { etiqueta: "Puntos", valor: String(NEW_CARD.points) }
    ];
  }
  const amounts = rules.montos?.length ? rules.montos : [100];
  return [
    { etiqueta: "Saldo", valor: formatMoney(amounts[0]) },
    { etiqueta: "Vigencia", valor: `${rules.vigenciaMeses || card.vigenciaMeses || 12} meses` }
  ];
}

/** Valores reales de la tarjeta recién emitida en el backend (empieza en cero). */
function issuedFields(card, issued) {
  const rules = card.reglas || {};
  if (card.tipo === "Estampillas") {
    return [
      { etiqueta: "Sellos", valor: `${issued.estampillas ?? 0} / ${rules.sellosMeta || 10}` },
      { etiqueta: "Premio", valor: rules.premio || "Recompensa" }
    ];
  }
  if (card.tipo === "Cashback") {
    return [
      { etiqueta: "Saldo", valor: formatMoney(issued.saldoCashback ?? 0) },
      { etiqueta: "Cashback", valor: `${rules.porcentaje || 0}% por compra` }
    ];
  }
  if (card.tipo === "Niveles") {
    const levels = rules.niveles?.length ? rules.niveles : [{ nombre: "Nivel 1", desdePuntos: 0 }];
    const points = issued.puntos ?? 0;
    return [
      { etiqueta: "Nivel", valor: currentLevel(levels, points)?.nombre || "Nivel 1" },
      { etiqueta: "Puntos", valor: String(points) }
    ];
  }
  return [
    { etiqueta: "Saldo", valor: formatMoney(issued.saldoGiftcard ?? 0) },
    { etiqueta: "Vigencia", valor: `${rules.vigenciaMeses || card.vigenciaMeses || 12} meses` }
  ];
}

export function buildWalletPass(card, { client, detail, issued = null }) {
  return {
    tipo: card.tipo,
    nombre: card.nombre,
    negocio: card.negocio,
    color: card.colores?.primario || card.color,
    logo: card.imagen || null,
    portada: card.portada || null,
    cliente: client,
    campos: walletFields(card, issued),
    qr: issued?.qrToken || null,
    detalle: detail
  };
}
