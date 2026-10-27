import { getDatabase, hashPassword, saveDatabase } from "../database";
import { badRequest, conflict, nextId, requireText, respond, unauthorized } from "../http";
import { DISTRICT_NAMES } from "../../utils/constants";
import { mapPositionFor } from "../../utils/geo";

const ACCESS_TOKEN_MINUTES = 30;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function encode(payload) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
}

function decode(token) {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(token))));
  } catch {
    return null;
  }
}

function issueSession(user) {
  const db = getDatabase();
  const token = `demo.${encode({ sub: user.email, exp: Date.now() + ACCESS_TOKEN_MINUTES * 60000 })}`;
  const refreshToken = `refresh.${crypto.randomUUID()}`;
  db.refreshTokens = [...(db.refreshTokens || []).filter(item => item.email !== user.email), { token: refreshToken, email: user.email }];
  saveDatabase();
  return { token, type: "Bearer", email: user.email, refreshToken };
}

export function userFromAuthorization(header) {
  const token = String(header || "").replace(/^Bearer\s+/i, "");
  if (!token.startsWith("demo.")) return null;
  const payload = decode(token.slice(5));
  if (!payload || payload.exp < Date.now()) return null;
  return getDatabase().usuarios.find(user => user.email === payload.sub) || null;
}

function profileOf(user) {
  const settings = getDatabase().configuracion;
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    phone: user.email === settings.perfilCorreo ? settings.perfilTelefono : "",
    provider: user.provider
  };
}

function syncProfile(user) {
  const settings = getDatabase().configuracion;
  settings.perfilNombre = user.fullName;
  settings.perfilCorreo = user.email;
}

export const authHandlers = [
  {
    method: "post",
    path: "/auth/login",
    handler: ({ body }) => {
      const email = requireText(body.email, "El email es obligatorio").toLowerCase();
      const password = requireText(body.password, "La contraseña es obligatoria");
      const user = getDatabase().usuarios.find(item => item.email === email);
      if (!user || user.passwordHash !== hashPassword(password)) {
        throw unauthorized("Correo o contraseña incorrectos.");
      }
      syncProfile(user);
      return respond(issueSession(user));
    }
  },
  {
    method: "post",
    path: "/auth/register",
    handler: ({ body }) => {
      const db = getDatabase();
      const email = requireText(body.email, "El email es obligatorio").toLowerCase();
      if (!EMAIL_PATTERN.test(email)) throw badRequest("Debe ser un formato de email válido");
      const password = requireText(body.password, "La contraseña es obligatoria");
      if (password.length < 8) throw badRequest("La contraseña debe tener al menos 8 caracteres");
      const businessName = requireText(body.businessName, "El nombre del negocio es obligatorio");
      const firstName = requireText(body.firstName, "El nombre es obligatorio");
      const lastName = requireText(body.lastName, "El apellido es obligatorio");
      if (!DISTRICT_NAMES.includes(body.district)) throw badRequest("Selecciona un distrito válido");
      if (db.usuarios.some(user => user.email === email)) {
        throw conflict("Ya existe una cuenta registrada con este correo.");
      }
      const user = {
        id: nextId(db.usuarios),
        email,
        passwordHash: hashPassword(password),
        fullName: `${firstName} ${lastName}`,
        role: "ADMIN",
        provider: "password"
      };
      db.usuarios.push(user);
      db.configuracion.marca = businessName;
      syncProfile(user);
      db.configuracion.perfilTelefono = "";
      let location = db.ubicaciones.find(place => place.nombre.toLowerCase() === businessName.toLowerCase());
      if (!location) {
        const position = mapPositionFor(body.district);
        location = {
          id: nextId(db.ubicaciones),
          nombre: businessName,
          categoria: body.category || "Otro",
          direccion: String(body.address || "").trim() || "Dirección pendiente",
          distrito: body.district,
          mapX: position.x,
          mapY: position.y,
          latitud: position.latitud,
          longitud: position.longitud,
          horario: "Horario por definir",
          clientes: 0,
          activa: true
        };
        db.ubicaciones.unshift(location);
      }
      db.geolocalizacion.ubicacionId = location.id;
      saveDatabase();
      return respond(issueSession(user), 201);
    }
  },
  {
    method: "post",
    path: "/auth/oauth/:provider",
    handler: ({ params }) => {
      const providers = { google: "Google", apple: "Apple" };
      const providerName = providers[params.provider];
      if (!providerName) throw badRequest("Proveedor de acceso no soportado");
      const db = getDatabase();
      const email = `demo.${params.provider}@fidegresa.com`;
      let user = db.usuarios.find(item => item.email === email);
      if (!user) {
        user = {
          id: nextId(db.usuarios),
          email,
          passwordHash: null,
          fullName: `Cuenta de ${providerName}`,
          role: "ADMIN",
          provider: params.provider
        };
        db.usuarios.push(user);
      }
      syncProfile(user);
      return respond(issueSession(user));
    }
  },
  {
    method: "post",
    path: "/auth/refresh",
    handler: ({ body }) => {
      const db = getDatabase();
      const stored = (db.refreshTokens || []).find(item => item.token === body.refreshToken);
      const user = stored && db.usuarios.find(item => item.email === stored.email);
      if (!user) throw unauthorized("La sesión expiró. Vuelve a iniciar sesión.");
      return respond(issueSession(user));
    }
  },
  {
    method: "post",
    path: "/auth/logout",
    auth: true,
    handler: ({ user }) => {
      const db = getDatabase();
      db.refreshTokens = (db.refreshTokens || []).filter(item => item.email !== user.email);
      saveDatabase();
      return respond(null, 204);
    }
  },
  {
    method: "get",
    path: "/auth/me",
    auth: true,
    handler: ({ user }) => respond(profileOf(user))
  }
];
