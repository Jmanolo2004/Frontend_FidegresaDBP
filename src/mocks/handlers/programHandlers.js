import { getDatabase, saveDatabase } from "../database";
import { badRequest, nextId, notFound, requireText, respond } from "../http";
import { CARD_TYPES } from "../../utils/constants";

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const IMAGE_DATA = /^data:image\/(?:png|jpeg|webp);base64,/i;

function withStatus(db, card) {
  const location = db.ubicaciones.find(place => place.nombre === card.negocio);
  return {
    ...card,
    activa: location ? location.activa : card.estado !== "En pausa",
    clientes: db.clientes.filter(customer => customer.tarjeta === card.negocio).length
  };
}

function sanitizeProgram(body, db) {
  const tipo = CARD_TYPES.includes(body.tipo) ? body.tipo : null;
  if (!tipo) throw badRequest("Elige un tipo de programa válido.");
  const negocio = requireText(body.negocio, "Elige el local asociado.");
  if (!db.ubicaciones.some(place => place.nombre === negocio)) throw badRequest("El local asociado no existe.");
  const image = typeof body.imagen === "string" && IMAGE_DATA.test(body.imagen) ? body.imagen : "";
  if (image.length > 700000) throw badRequest("La imagen debe pesar 500 KB o menos.");
  const program = {
    nombre: requireText(body.nombre, "Escribe el nombre de la tarjeta.").slice(0, 50),
    tipo,
    negocio,
    descripcion: requireText(body.descripcion, "Escribe el mensaje de beneficio.").slice(0, 100),
    premio: requireText(body.premio, "Escribe el premio o nivel destacado.").slice(0, 70),
    color: HEX_COLOR.test(body.color) ? body.color : "#603f2a",
    colorAcento: HEX_COLOR.test(body.colorAcento) ? body.colorAcento : "#c8894f",
    estilo: ["elegante", "corporativo", "vibrante"].includes(body.estilo) ? body.estilo : "elegante",
    imagen: image,
    mostrarProgreso: body.mostrarProgreso !== false,
    mostrarQr: body.mostrarQr !== false
  };
  if (tipo === "Estampillas") program.estampillas = Math.min(12, Math.max(2, Number(body.estampillas) || 10));
  if (tipo === "Cashback") program.porcentaje = Math.min(50, Math.max(1, Number(body.porcentaje) || 5));
  if (tipo === "Niveles") program.niveles = Number(body.niveles) === 4 ? 4 : 3;
  if (tipo === "Giftcard") program.saldo = Math.min(10000, Math.max(1, Number(body.saldo) || 100));
  return program;
}

function findProgram(db, id) {
  const program = db.tarjetas.find(item => Number(item.id) === Number(id));
  if (!program) throw notFound("No encontramos esta tarjeta.");
  return program;
}

export const programHandlers = [
  {
    method: "get",
    path: "/loyalty-programs",
    auth: true,
    handler: ({ query }) => {
      const db = getDatabase();
      const type = query.type && query.type !== "Todas" ? query.type : null;
      return respond(db.tarjetas.filter(card => !type || card.tipo === type).map(card => withStatus(db, card)));
    }
  },
  {
    method: "get",
    path: "/loyalty-programs/:id",
    auth: true,
    handler: ({ params }) => {
      const db = getDatabase();
      return respond(withStatus(db, findProgram(db, params.id)));
    }
  },
  {
    method: "post",
    path: "/loyalty-programs",
    auth: true,
    handler: ({ body }) => {
      const db = getDatabase();
      const program = { id: nextId(db.tarjetas), estado: "Activa", ...sanitizeProgram(body, db) };
      db.tarjetas.unshift(program);
      saveDatabase();
      return respond(withStatus(db, program), 201);
    }
  },
  {
    method: "put",
    path: "/loyalty-programs/:id",
    auth: true,
    handler: ({ params, body }) => {
      const db = getDatabase();
      const current = findProgram(db, params.id);
      const updated = { ...current, ...sanitizeProgram(body, db) };
      db.tarjetas = db.tarjetas.map(item => (item.id === current.id ? updated : item));
      saveDatabase();
      return respond(withStatus(db, updated));
    }
  },
  {
    method: "delete",
    path: "/loyalty-programs/:id",
    auth: true,
    handler: ({ params }) => {
      const db = getDatabase();
      const current = findProgram(db, params.id);
      db.tarjetas = db.tarjetas.filter(item => item.id !== current.id);
      saveDatabase();
      return respond(null, 204);
    }
  }
];
