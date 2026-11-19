import { apiClient, toPage } from "./apiClient";

function normalizeBranch(branch) {
  return {
    id: branch.id,
    name: branch.name,
    address: branch.address ?? "",
    latitude: branch.latitude != null ? Number(branch.latitude) : null,
    longitude: branch.longitude != null ? Number(branch.longitude) : null
  };
}

/** GET /branches → locales del negocio del cajero. */
export async function getBranches({ signal } = {}) {
  const { data } = await apiClient.get("/branches", { params: { size: 100 }, signal });
  return toPage(data).items.map(normalizeBranch);
}
