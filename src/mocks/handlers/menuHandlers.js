import { getDatabase, saveDatabase } from "../database";
import { badRequest, nextId, notFound, requireText, respond } from "../http";

// Menú del panel en modo demo: catálogo web, invitación al club y productos (misma forma que la API).
// Los archivos (PDF, fotos) no se guardan en el modo demo.
const DEFAULT_INVITATION = { title: "¡Únete a nuestro club!", text: "Únete a nuestro club de beneficios y disfruta de ofertas especiales.", buttonLabel: "Unirse ahora" };

const SEED_PRODUCTS = [
  { name: "Café americano", description: "Grano de altura de Chanchamayo.", price: 8 },
  { name: "Latte de vainilla", description: "Espresso, leche y vainilla natural.", price: 12.5 },
  { name: "Croissant de mantequilla", description: "Horneado cada mañana.", price: 7 },
  { name: "Cheesecake de maracuyá", description: "Porción individual.", price: 14, inStock: false }
];

function findBranch(db, branchId) {
  const branch = db.ubicaciones.find(place => Number(place.id) === Number(branchId));
  if (!branch) throw notFound("Local no encontrado.");
  return branch;
}

function menuOf(db, branchId) {
  db.menus = db.menus || {};
  if (!db.menus[branchId]) {
    const now = new Date().toISOString();
    db.menus[branchId] = {
      web: null,
      invitation: null,
      products: Number(branchId) === 1
        ? SEED_PRODUCTS.map((product, index) => ({ id: index + 1, inStock: true, position: index, imageUrl: null, updatedAt: now, ...product }))
        : []
    };
  }
  return db.menus[branchId];
}

function invitationResponse(db, branch, saved) {
  if (!saved) return { configured: false, ...DEFAULT_INVITATION, program: null, image: null, active: false, endsOn: null, status: "INCOMPLETE", live: false, updatedAt: null };
  const program = db.tarjetas.find(card => Number(card.id) === Number(saved.programId));
  const available = Boolean(program && program.estado === "Activa" && program.negocio === branch.nombre);
  const expired = saved.endsOn && saved.endsOn < new Date().toISOString().slice(0, 10);
  const status = !program ? "INCOMPLETE" : expired ? "EXPIRED" : saved.active ? "LIVE" : "PAUSED";
  return {
    configured: true,
    title: saved.title,
    text: saved.text,
    buttonLabel: saved.buttonLabel,
    program: program ? { id: program.id, name: program.nombre, type: program.tipo, available } : null,
    image: null,
    active: saved.active,
    endsOn: saved.endsOn,
    status,
    live: status === "LIVE" && available,
    updatedAt: saved.updatedAt
  };
}

/** La invitación vigente del local, en la forma del menú público (null si no está activa). */
export function liveInvitation(db, branch) {
  const response = invitationResponse(db, branch, menuOf(db, branch.id).invitation);
  if (!response.live) return null;
  return { title: response.title, text: response.text, buttonLabel: response.buttonLabel, imageUrl: null, programId: response.program.id };
}

/** El catálogo web activo del local, para el menú público. */
export function liveWebUrl(db, branch) {
  const web = menuOf(db, branch.id).web;
  return web?.active ? web.url : null;
}

function productBody(body) {
  const name = requireText(body.name, "Escribe el nombre del producto.").slice(0, 80);
  const price = Number(body.price);
  if (!Number.isFinite(price) || price < 0) throw badRequest("Escribe un precio válido.");
  return { name, description: String(body.description || "").trim().slice(0, 200), price: Math.round(price * 100) / 100, inStock: body.inStock !== false };
}

function findProduct(menu, productId) {
  const product = menu.products.find(item => Number(item.id) === Number(productId));
  if (!product) throw notFound("Producto no encontrado.");
  return product;
}

export const menuHandlers = [
  {
    method: "get",
    path: "/branches/:branchId/catalogs",
    auth: true,
    handler: ({ params }) => {
      const db = getDatabase();
      findBranch(db, params.branchId);
      return respond({ pdf: null, web: menuOf(db, params.branchId).web });
    }
  },
  {
    method: "put",
    path: "/branches/:branchId/catalogs/web",
    auth: true,
    handler: ({ params, body }) => {
      const db = getDatabase();
      findBranch(db, params.branchId);
      const url = requireText(body.url, "Escribe el enlace de tu carta.");
      if (!/^https?:\/\/\S+\.\S+/.test(url)) throw badRequest("Escribe un enlace que empiece con https://");
      const active = body.active !== false;
      const web = { id: 1, type: "web", status: active ? "ACTIVE" : "HIDDEN", active, format: null, url, files: [], updatedAt: new Date().toISOString() };
      menuOf(db, params.branchId).web = web;
      saveDatabase();
      return respond(web);
    }
  },
  {
    method: "patch",
    path: "/branches/:branchId/catalogs/:type",
    auth: true,
    handler: ({ params, body }) => {
      const db = getDatabase();
      const menu = menuOf(db, params.branchId);
      if (params.type !== "web" || !menu.web) throw notFound("Este catálogo no existe.");
      menu.web = { ...menu.web, active: body.active !== false, status: body.active !== false ? "ACTIVE" : "HIDDEN" };
      saveDatabase();
      return respond(menu.web);
    }
  },
  {
    method: "delete",
    path: "/branches/:branchId/catalogs/:type",
    auth: true,
    handler: ({ params }) => {
      const db = getDatabase();
      if (params.type === "web") menuOf(db, params.branchId).web = null;
      saveDatabase();
      return respond(null, 204);
    }
  },
  {
    method: "post",
    path: "/branches/:branchId/catalogs/pdf/files",
    auth: true,
    handler: () => {
      throw badRequest("En el modo demo no se pueden subir archivos. Conéctate al backend para subir tu carta.");
    }
  },
  {
    method: "get",
    path: "/branches/:branchId/invitation",
    auth: true,
    handler: ({ params }) => {
      const db = getDatabase();
      const branch = findBranch(db, params.branchId);
      return respond(invitationResponse(db, branch, menuOf(db, branch.id).invitation));
    }
  },
  {
    method: "put",
    path: "/branches/:branchId/invitation",
    auth: true,
    handler: ({ params, body }) => {
      const db = getDatabase();
      const branch = findBranch(db, params.branchId);
      const saved = {
        title: requireText(body.title, "Escribe el título de la invitación.").slice(0, 60),
        text: requireText(body.text, "Escribe el texto de la invitación.").slice(0, 200),
        buttonLabel: String(body.buttonLabel || "").trim().slice(0, 30) || DEFAULT_INVITATION.buttonLabel,
        programId: body.programId || null,
        active: body.active !== false,
        endsOn: body.endsOn || null,
        updatedAt: new Date().toISOString()
      };
      menuOf(db, branch.id).invitation = saved;
      saveDatabase();
      return respond(invitationResponse(db, branch, saved));
    }
  },
  {
    method: "get",
    path: "/branches/:branchId/products",
    auth: true,
    handler: ({ params }) => {
      const db = getDatabase();
      findBranch(db, params.branchId);
      return respond(menuOf(db, params.branchId).products);
    }
  },
  {
    method: "post",
    path: "/branches/:branchId/products",
    auth: true,
    handler: ({ params, body }) => {
      const db = getDatabase();
      findBranch(db, params.branchId);
      const menu = menuOf(db, params.branchId);
      const product = { id: nextId(menu.products), ...productBody(body), position: menu.products.length, imageUrl: null, updatedAt: new Date().toISOString() };
      menu.products.push(product);
      saveDatabase();
      return respond(product, 201);
    }
  },
  {
    method: "put",
    path: "/branches/:branchId/products/:productId",
    auth: true,
    handler: ({ params, body }) => {
      const db = getDatabase();
      const product = findProduct(menuOf(db, params.branchId), params.productId);
      Object.assign(product, productBody(body), { updatedAt: new Date().toISOString() });
      saveDatabase();
      return respond(product);
    }
  },
  {
    method: "patch",
    path: "/branches/:branchId/products/:productId/stock",
    auth: true,
    handler: ({ params, body }) => {
      const db = getDatabase();
      const product = findProduct(menuOf(db, params.branchId), params.productId);
      product.inStock = body.inStock !== false;
      saveDatabase();
      return respond(product);
    }
  },
  {
    method: "delete",
    path: "/branches/:branchId/products/:productId",
    auth: true,
    handler: ({ params }) => {
      const db = getDatabase();
      const menu = menuOf(db, params.branchId);
      findProduct(menu, params.productId);
      menu.products = menu.products.filter(item => Number(item.id) !== Number(params.productId));
      saveDatabase();
      return respond(null, 204);
    }
  },
  {
    method: "post",
    path: "/branches/:branchId/products/:productId/image",
    auth: true,
    handler: ({ params }) => {
      // Sin archivos en el modo demo: el producto se guarda sin foto.
      const db = getDatabase();
      return respond(findProduct(menuOf(db, params.branchId), params.productId));
    }
  }
];
