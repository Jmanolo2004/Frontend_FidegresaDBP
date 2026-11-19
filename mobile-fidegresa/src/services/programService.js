import { apiClient, toPage } from "./apiClient";

/** Los 4 tipos de tarjeta, con el nombre que usa el backend en /loyalty-programs?type=… */
export const CARD_TYPE_OPTIONS = [
  { key: "Estampillas", label: "Estampillas", description: "Sellos por visita o compra", icon: "cafe-outline", color: "#5c3a28" },
  { key: "Cashback", label: "Cashback", description: "Saldo por cada compra", icon: "cash-outline", color: "#b06b2a" },
  { key: "Niveles", label: "Niveles", description: "Puntos para subir de nivel", icon: "trophy-outline", color: "#2f6b50" },
  { key: "Giftcard", label: "Gift cards", description: "Saldo de regalo para cobrar", icon: "gift-outline", color: "#7a4a6c" }
];

/** GET /loyalty-programs?type=…&status=Activa → programas del negocio de ese tipo. */
export async function getProgramsByType(type, { signal } = {}) {
  const { data } = await apiClient.get("/loyalty-programs", { params: { type }, signal });
  return toPage(data).items.map(program => ({
    id: program.id,
    name: program.nombre ?? "Programa",
    branchId: program.ubicacionId ?? null,
    branchName: program.negocio ?? "",
    status: program.estado ?? "",
    color: /^#[0-9a-f]{6}$/i.test(program.colores?.primario ?? "") ? program.colores.primario : null
  }));
}

/** GET /loyalty-programs/{id} → colores del programa, los mismos de su tarjeta en el panel y en Google Wallet. */
export async function getProgramStyle(programId, { signal } = {}) {
  const { data } = await apiClient.get(`/loyalty-programs/${programId}`, { signal });
  const valid = value => (/^#[0-9a-f]{6}$/i.test(value ?? "") ? value : null);
  return { color: valid(data.colores?.primario ?? data.color), accent: valid(data.colores?.acento ?? data.colorAcento), branchName: data.negocio ?? "" };
}

/** GET /loyalty-programs/{id}/customers → clientes del programa con el token de su tarjeta. */
export async function getProgramCustomers(programId, { signal } = {}) {
  const { data } = await apiClient.get(`/loyalty-programs/${programId}/customers`, { params: { page: 0, size: 100 }, signal });
  return toPage(data).items.map(customer => ({
    id: customer.id,
    name: customer.nombre ?? "Cliente",
    initials: customer.iniciales ?? "",
    progress: customer.progreso ?? "",
    qrToken: customer.qrToken ?? null
  }));
}

/**
 * Tarjetas de un tipo listas para elegir: une los clientes de todos los programas de ese tipo.
 * Si hay un local elegido, muestra primero sus programas; si ese local no tiene, muestra los de todos.
 */
export async function getCardsByType(type, branchId, { signal } = {}) {
  const programs = await getProgramsByType(type, { signal });
  const ofBranch = branchId ? programs.filter(program => program.branchId === branchId) : [];
  const selected = ofBranch.length ? ofBranch : programs;
  const lists = await Promise.all(
    selected.map(async program => {
      const customers = await getProgramCustomers(program.id, { signal });
      return customers
        .filter(customer => customer.qrToken)
        .map(customer => ({ ...customer, key: `${program.id}-${customer.id}`, programName: program.name, branchName: program.branchName }));
    })
  );
  return lists.flat().sort((a, b) => a.name.localeCompare(b.name, "es"));
}
