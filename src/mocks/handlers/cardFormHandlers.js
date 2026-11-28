import { getDatabase, saveDatabase } from "../database";
import { HttpError, badRequest, conflict, nextId, notFound, requireText, respond } from "../http";

// Formulario público de cada tarjeta (QR del detalle) en el modo demo: misma forma que el backend.
const PREFIX = { Estampillas: "EST", Cashback: "CSH", Niveles: "NIV", Giftcard: "GFT" };
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NAME = 60;

function randomCode(length) {
  return Array.from({ length }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");
}

/** Código público estable de la tarjeta: no expone el id interno. */
function joinCode(program) {
  program.codigoRegistro = program.codigoRegistro || randomCode(8);
  return program.codigoRegistro;
}

function programByCode(db, code) {
  const program = db.tarjetas.find(item => item.codigoRegistro && item.codigoRegistro === String(code || "").toUpperCase());
  if (!program) throw notFound("Este formulario no existe o la tarjeta ya no está disponible.");
  return program;
}

/** Solo lo que el cliente necesita ver; nada de métricas ni costos del negocio. */
function publicProgram(program) {
  return {
    nombre: program.nombre,
    tipo: program.tipo,
    negocio: program.negocio,
    descripcion: program.descripcion || null,
    colores: program.colores || null,
    estilo: program.estilo || null,
    imagen: program.imagen || null,
    portada: program.portada || null,
    reglas: program.reglas || {},
    terminos: program.terminos || null,
    vigenciaMeses: program.vigenciaMeses || null
  };
}

/** "1998-07-25" real, no futuro y desde 1900. */
export function validBirthDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return false;
  return year >= 1900 && date.getTime() <= Date.now();
}

function cardState(customer, program) {
  const token = customer.qrTokens[program.id];
  const state = customer.estadoTarjetas?.[token] || {};
  return {
    qrToken: token,
    cliente: customer.nombre,
    estampillas: state.estampillas || 0,
    saldo: state.saldo || 0,
    puntos: state.puntos || 0,
    actualizadaEn: state.actualizadaEn || customer.fechaRegistro
  };
}

function findCard(db, token) {
  for (const customer of db.clientes) {
    const entry = Object.entries(customer.qrTokens || {}).find(([, value]) => value === token);
    if (entry) return { customer, program: db.tarjetas.find(item => Number(item.id) === Number(entry[0])) };
  }
  throw notFound("No encontramos esta tarjeta.");
}

export const cardFormHandlers = [
  {
    method: "get",
    path: "/loyalty-programs/:id/join-link",
    handler: ({ params }) => {
      const db = getDatabase();
      const program = db.tarjetas.find(item => Number(item.id) === Number(params.id));
      if (!program) throw notFound("No encontramos la tarjeta.");
      const code = joinCode(program);
      saveDatabase();
      return respond({ code, path: `/tarjeta/${code}`, url: null });
    }
  },
  {
    method: "get",
    path: "/public/join/:code",
    handler: ({ params }) => {
      const program = programByCode(getDatabase(), params.code);
      return respond({ code: program.codigoRegistro, activa: program.estado === "Activa", tarjeta: publicProgram(program) });
    }
  },
  {
    method: "post",
    path: "/public/join/:code",
    handler: ({ params, body }) => {
      const db = getDatabase();
      const program = programByCode(db, params.code);
      if (program.estado !== "Activa") throw badRequest("Esta tarjeta no está recibiendo registros por ahora.");
      const firstName = requireText(body.firstName, "Escribe tu nombre.").slice(0, NAME);
      const lastName = requireText(body.lastName, "Escribe tu apellido.").slice(0, NAME);
      const email = requireText(body.email, "Escribe tu correo.").toLowerCase();
      if (!EMAIL.test(email)) throw badRequest("Escribe un correo válido.");
      if (!validBirthDate(body.birthDate)) throw badRequest("Elige tu fecha de nacimiento.");
      const fullName = `${firstName} ${lastName}`;

      let customer = db.clientes.find(item => item.correo === email);
      const alreadyRegistered = Boolean(customer?.qrTokens?.[program.id]);
      if (customer && customer.fechaNacimiento && customer.fechaNacimiento !== body.birthDate) {
        throw conflict("Este correo ya está registrado con otros datos. Pide ayuda en caja.");
      }
      if (!customer) {
        const branch = db.ubicaciones.find(place => place.nombre === program.negocio) || db.ubicaciones[0];
        const now = new Date().toISOString();
        customer = {
          id: nextId(db.clientes),
          nombre: fullName,
          correo: email,
          telefono: "",
          tarjeta: program.negocio,
          localId: branch.id,
          distrito: branch.distrito,
          latitud: branch.latitud,
          longitud: branch.longitud,
          mapX: branch.mapX + 24,
          mapY: branch.mapY - 18,
          fechaRegistro: now,
          ultimaVisita: now,
          visitas: 0,
          estampillas: 0,
          saldoCashback: 0,
          cumpleanos: `${Number(body.birthDate.slice(8))}/${Number(body.birthDate.slice(5, 7))}`,
          fechaNacimiento: body.birthDate,
          aceptaPromociones: body.marketingConsent === true,
          iniciales: `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase(),
          foto: null,
          estado: "Activa",
          origen: "Formulario de tarjeta"
        };
        db.clientes.unshift(customer);
      }
      customer.qrTokens = customer.qrTokens || {};
      customer.qrTokens[program.id] = customer.qrTokens[program.id] || `FDG-${PREFIX[program.tipo] || "EST"}-${randomCode(6)}`;
      const response = {
        alreadyRegistered,
        customerName: customer.nombre,
        welcomeEmail: !alreadyRegistered,
        card: cardState(customer, program)
      };
      saveDatabase();
      return respond(response, alreadyRegistered ? 200 : 201);
    }
  },
  {
    method: "get",
    path: "/public/cards/:qrToken",
    handler: ({ params }) => {
      const { customer, program } = findCard(getDatabase(), params.qrToken);
      return respond(cardState(customer, program));
    }
  },
  {
    method: "post",
    path: "/public/cards/:qrToken/google-wallet",
    handler: ({ params }) => {
      findCard(getDatabase(), params.qrToken);
      throw new HttpError(503, "En el modo demo no se abre Google Wallet. En el sitio publicado se guarda tu tarjeta de verdad.");
    }
  }
];
