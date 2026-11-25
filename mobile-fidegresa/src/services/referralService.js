import { apiClient, toPage } from "./apiClient";

/**
 * GET /business-referrals → "Recomienda Fidegresa": el código y el enlace del negocio para invitar a otros dueños,
 * cuántos se registraron, cuántos ya crearon su primera tarjeta y la lista de negocios invitados.
 */
export async function getBusinessReferrals({ signal } = {}) {
  const { data } = await apiClient.get("/business-referrals", { params: { page: 0, size: 50 }, signal });
  return {
    code: data.code ?? "",
    link: data.link ?? null,
    registered: Number(data.registered ?? 0),
    converted: Number(data.converted ?? 0),
    items: toPage(data.referrals).items.map(item => ({
      id: item.id,
      businessName: item.businessName ?? "Negocio",
      status: item.status === "CONVERTED" ? "CONVERTED" : "REGISTERED",
      createdAt: item.createdAt,
      convertedAt: item.convertedAt ?? null
    }))
  };
}

/** Mensaje para compartir el enlace con otro dueño de negocio. */
export function referralMessage(link, code) {
  const target = link ?? `el código ${code}`;
  return `Hola, te recomiendo Fidegresa: tarjetas de fidelidad digitales en Google Wallet para premiar a tus clientes más fieles y saber quién vuelve. Regístrate con mi invitación: ${target}`;
}
