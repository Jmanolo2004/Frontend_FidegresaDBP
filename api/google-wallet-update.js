import { createSign } from "node:crypto";

// Actualiza en Google Wallet el pase de una tarjeta real después de cada movimiento (sellos, saldo o puntos).
// La app de caja llama a esta función con el token de su sesión; los valores se leen del backend,
// nunca del celular, así nadie puede escribir un saldo falso en el pase.
// Variables de entorno (las mismas de api/google-wallet.js, más una opcional):
//   GOOGLE_WALLET_ISSUER_ID, GOOGLE_WALLET_SERVICE_ACCOUNT
//   FIDEGRESA_API_URL  URL del backend (por defecto https://fidegresa-api.onrender.com/api/v1)

const API_URL = (process.env.FIDEGRESA_API_URL || "https://fidegresa-api.onrender.com/api/v1").replace(/\/+$/, "");
const WALLET_API = "https://walletobjects.googleapis.com/walletobjects/v1/genericObject";
const CARD_TOKEN = /^FDG-[A-Z]{3}-[A-Z0-9]{4,12}$/;

function base64url(input) {
  return Buffer.from(input).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function readServiceAccount() {
  try {
    const account = JSON.parse(process.env.GOOGLE_WALLET_SERVICE_ACCOUNT || "");
    if (!account.client_email || !account.private_key) return null;
    return { ...account, private_key: account.private_key.replace(/\\n/g, "\n") };
  } catch {
    return null;
  }
}

/** Token de acceso de la cuenta de servicio para la API de Google Wallet. */
async function googleAccessToken(account) {
  const now = Math.floor(Date.now() / 1000);
  const claims = { iss: account.client_email, scope: "https://www.googleapis.com/auth/wallet_object.issuer", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 };
  const unsigned = `${base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${base64url(JSON.stringify(claims))}`;
  const assertion = `${unsigned}.${base64url(createSign("RSA-SHA256").update(unsigned).sign(account.private_key))}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) throw new Error("No se pudo autenticar con Google Wallet.");
  return data.access_token;
}

const soles = value => `S/ ${Number(value || 0).toFixed(2)}`;

/** Los dos datos del frente del pase, con los valores reales de la tarjeta (mismo formato que al crearla). */
function walletFields(card) {
  const program = card.program || {};
  switch (card.programType) {
    case "CASHBACK":
      return [
        { header: "Saldo", body: soles(card.cashbackBalance) },
        { header: "Cashback", body: `${Number(program.cashbackPercent || 0)}% por compra` }
      ];
    case "LEVELS": {
      const level = (program.levels || []).find(item => item.number === card.level);
      return [
        { header: "Nivel", body: level?.name || `Nivel ${card.level}` },
        { header: "Puntos", body: String(card.points ?? 0) }
      ];
    }
    case "GIFT_CARD":
      return [
        { header: "Saldo", body: soles(card.giftBalance) },
        { header: "Monto inicial", body: soles(card.giftInitialAmount) }
      ];
    default:
      return [
        { header: "Sellos", body: `${Math.min(card.stampBalance ?? 0, program.requiredStamps || 10)} / ${program.requiredStamps || 10}` },
        { header: "Premio", body: program.rewards?.[0]?.name || "Recompensa" }
      ];
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Usa POST." });
  }
  const issuerId = (process.env.GOOGLE_WALLET_ISSUER_ID || "").trim();
  const account = readServiceAccount();
  if (!/^\d+$/.test(issuerId) || !account) return res.status(503).json({ message: "Google Wallet no está configurado en el servidor." });

  const auth = req.headers.authorization || "";
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = null;
    }
  }
  const qrToken = String(body?.qrToken || "").trim().toUpperCase();
  if (!auth.startsWith("Bearer ") || !CARD_TOKEN.test(qrToken)) return res.status(400).json({ message: "Faltan la sesión o el código de la tarjeta." });

  try {
    // 1) La tarjeta real, leída del backend con la sesión del cajero (si la sesión no vale, no se actualiza nada).
    const cardResponse = await fetch(`${API_URL}/cards/qr/${encodeURIComponent(qrToken)}`, { headers: { Authorization: auth } });
    if (!cardResponse.ok) return res.status(cardResponse.status === 404 ? 404 : 401).json({ message: "No se pudo leer la tarjeta en el backend." });
    const card = await cardResponse.json();

    // 2) El pase en Google Wallet (si el cliente nunca lo guardó, no hay nada que actualizar).
    const token = await googleAccessToken(account);
    const objectUrl = `${WALLET_API}/${encodeURIComponent(`${issuerId}.${qrToken.replace(/[^A-Z0-9_-]/g, "")}`)}`;
    const current = await fetch(objectUrl, { headers: { Authorization: `Bearer ${token}` } });
    if (current.status === 404) return res.status(200).json({ updated: false, reason: "El pase todavía no existe en Google Wallet." });
    if (!current.ok) throw new Error("No se pudo leer el pase.");
    const object = await current.json();

    // 3) Reemplaza solo los dos datos del frente y conserva el resto (cómo funciona, aviso).
    const [first, second] = walletFields(card);
    const others = (object.textModulesData || []).filter(item => item.id !== "dato1" && item.id !== "dato2");
    const textModulesData = [{ id: "dato1", ...first }, { id: "dato2", ...second }, ...others];
    const patch = await fetch(objectUrl, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ textModulesData, state: card.status === "BLOCKED" ? "INACTIVE" : "ACTIVE" })
    });
    if (!patch.ok) throw new Error("Google Wallet rechazó la actualización.");
    return res.status(200).json({ updated: true, fields: textModulesData.slice(0, 2) });
  } catch (error) {
    return res.status(502).json({ message: error.message || "No se pudo actualizar el pase." });
  }
}
