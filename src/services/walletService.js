// La firma se hace en la función de Vercel (api/google-wallet.js), no en el backend de Spring:
// por eso usa fetch directo al mismo dominio del sitio y no el apiClient.
export const walletService = {
  async createGoogleWalletLink(pass) {
    let response;
    try {
      response = await fetch("/api/google-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pass)
      });
    } catch {
      throw new Error("No hay conexión. Revisa tu internet e inténtalo otra vez.");
    }
    const data = await response.json().catch(() => null);
    if (response.ok && data?.saveUrl) return data.saveUrl;
    if (response.status === 404 || !data) {
      throw new Error("Google Wallet solo funciona en el sitio publicado en Vercel (o con «vercel dev»), no con «npm run dev».");
    }
    throw new Error(data.message || "No pudimos crear la tarjeta de Google Wallet.");
  }
};
