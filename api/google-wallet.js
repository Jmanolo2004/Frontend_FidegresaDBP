import { createSign, randomBytes } from "node:crypto";

// Firma el enlace "Agregar a Google Wallet" de una tarjeta de prueba.
// Variables de entorno (Vercel → Settings → Environment Variables):
//   GOOGLE_WALLET_ISSUER_ID        ID de la entidad emisora de Google Pay & Wallet Console
//   GOOGLE_WALLET_SERVICE_ACCOUNT  contenido completo del archivo JSON de la cuenta de servicio
// La clave privada nunca sale del servidor: el navegador solo recibe el enlace firmado.

const CLASS_SUFFIX = "fidegresa_tarjeta_v1";
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
// Código real de la tarjeta en el backend (lo genera CardIssuer): FDG-EST-7KQ2MA, FDG-CSH-…, FDG-NIV-…, FDG-GFT-…
const CARD_TOKEN = /^FDG-[A-Z]{3}-[A-Z0-9]{4,12}$/;
const SAVE_URL = "https://pay.google.com/gp/v/save/";

function base64url(input) {
  return Buffer.from(input).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function text(value, max, fallback = "") {
  const clean = String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
  return clean || fallback;
}

function localized(value) {
  return { defaultValue: { language: "es", value } };
}

function readServiceAccount() {
  const raw = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    const account = JSON.parse(raw);
    if (!account.client_email || !account.private_key) return null;
    return { ...account, private_key: account.private_key.replace(/\\n/g, "\n") };
  } catch {
    return null;
  }
}

// Las imágenes deben ser URL públicas con HTTPS para que Google pueda descargarlas.
function publicImage(path, siteOrigin) {
  if (typeof path !== "string" || !path || path.startsWith("data:") || path.startsWith("blob:")) return null;
  try {
    const url = new URL(path, siteOrigin);
    if (url.protocol !== "https:" || ["localhost", "127.0.0.1"].includes(url.hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function buildClass(issuerId) {
  const row = (left, right) => ({
    twoItems: {
      startItem: { firstValue: { fields: [{ fieldPath: `object.textModulesData['${left}']` }] } },
      endItem: { firstValue: { fields: [{ fieldPath: `object.textModulesData['${right}']` }] } }
    }
  });
  return {
    id: `${issuerId}.${CLASS_SUFFIX}`,
    classTemplateInfo: { cardTemplateOverride: { cardRowTemplateInfos: [row("dato1", "dato2")] } }
  };
}

/** Id fijo del pase de una tarjeta real: el mismo que usa api/google-wallet-update.js. */
export function walletObjectId(issuerId, qrToken) {
  return `${issuerId}.${String(qrToken).toUpperCase().replace(/[^A-Z0-9_-]/g, "")}`;
}

function buildObject(issuerId, body, siteOrigin) {
  const type = text(body.tipo, 20, "Estampillas");
  const business = text(body.negocio, 60, "Fidegresa");
  const fields = Array.isArray(body.campos) ? body.campos.slice(0, 2) : [];
  // Si llega el código de una tarjeta real del backend, el QR del pase es ese código: así la app de caja
  // la encuentra al escanear. Si no llega, se crea un código de muestra que el backend no conoce.
  const realToken = typeof body.qr === "string" && CARD_TOKEN.test(body.qr.trim().toUpperCase()) ? body.qr.trim().toUpperCase() : null;
  const serial = realToken ? realToken.slice(4) : `${type.slice(0, 3).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;
  const logo = publicImage(body.logo, siteOrigin) || new URL("/icon-512.png", siteOrigin).toString();
  const hero = publicImage(body.portada, siteOrigin);

  const textModulesData = fields.map((field, index) => ({
    id: `dato${index + 1}`,
    header: text(field?.etiqueta, 30, " "),
    body: text(field?.valor, 40, " ")
  }));
  const details = text(body.detalle, 400);
  if (details) textModulesData.push({ id: "reglas", header: "Cómo funciona", body: details });
  textModulesData.push({ id: "aviso", header: "Tarjeta de prueba", body: "Emitida por Fidegresa solo para pruebas." });

  return {
    // Con una tarjeta real, el id del pase es fijo (emisor.CÓDIGO): así la app de caja puede actualizarlo
    // después de cada escaneo (api/google-wallet-update.js).
    id: realToken ? walletObjectId(issuerId, realToken) : `${issuerId}.${serial.replace(/[^A-Za-z0-9_-]/g, "")}_${Date.now()}`,
    classId: `${issuerId}.${CLASS_SUFFIX}`,
    state: "ACTIVE",
    cardTitle: localized(business),
    subheader: localized(text(body.nombre, 60, type)),
    header: localized(text(body.cliente, 40, "Cliente de prueba")),
    hexBackgroundColor: HEX_COLOR.test(body.color || "") ? body.color : "#603f2a",
    logo: { sourceUri: { uri: logo }, contentDescription: localized(`Logo de ${business}`) },
    ...(hero ? { heroImage: { sourceUri: { uri: hero }, contentDescription: localized(`Portada de ${business}`) } } : {}),
    barcode: { type: "QR_CODE", value: realToken || `FDG-${serial}`, alternateText: serial },
    textModulesData
  };
}

function sign(payload, privateKey) {
  const unsigned = `${base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${base64url(JSON.stringify(payload))}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(privateKey);
  return `${unsigned}.${base64url(signature)}`;
}

export default function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Usa POST para crear la tarjeta." });
  }

  const issuerId = (process.env.GOOGLE_WALLET_ISSUER_ID || "").trim();
  const account = readServiceAccount();
  if (!/^\d+$/.test(issuerId) || !account) {
    return res.status(503).json({ message: "Google Wallet no está configurado en el servidor. Revisa las variables de entorno en Vercel." });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = null;
    }
  }
  if (!body || typeof body !== "object") {
    return res.status(400).json({ message: "Faltan los datos de la tarjeta." });
  }

  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const siteOrigin = `https://${host}`;

  try {
    const token = sign(
      {
        iss: account.client_email,
        aud: "google",
        typ: "savetowallet",
        iat: Math.floor(Date.now() / 1000),
        origins: [siteOrigin],
        payload: {
          genericClasses: [buildClass(issuerId)],
          genericObjects: [buildObject(issuerId, body, siteOrigin)]
        }
      },
      account.private_key
    );
    return res.status(200).json({ saveUrl: `${SAVE_URL}${token}` });
  } catch {
    return res.status(500).json({ message: "No pudimos firmar la tarjeta. Revisa que la clave JSON esté completa." });
  }
}
