import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { after, test } from "node:test";
import { createServer } from "vite";

globalThis.crypto ||= webcrypto;
let stored = null;
globalThis.localStorage = { getItem: () => stored, setItem: (_, value) => { stored = value; }, removeItem: () => { stored = null; } };

const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
after(() => server.close());
globalThis.window = { addEventListener: () => {}, location: { origin: "https://demo.fidegresa.app" } };
const { getDatabase } = await server.ssrLoadModule("/src/mocks/database.js");
const { cardFormHandlers } = await server.ssrLoadModule("/src/mocks/handlers/cardFormHandlers.js");
const handler = (method, path) => cardFormHandlers.find(item => item.method === method && item.path === path).handler;
const link = handler("get", "/loyalty-programs/:id/join-link");
const form = handler("get", "/public/join/:code");
const join = handler("post", "/public/join/:code");
const card = handler("get", "/public/cards/:qrToken");
const wallet = handler("post", "/public/cards/:qrToken/google-wallet");

const BODY = { firstName: "Valeria", lastName: "Ramírez", email: "Valeria.Test@Gmail.com", birthDate: "1998-07-25", marketingConsent: true };

function activeProgram() {
  return getDatabase().tarjetas.find(program => program.estado === "Activa");
}

test("el QR del detalle apunta a un código público estable", () => {
  const program = activeProgram();
  const first = link({ params: { id: String(program.id) } }).data;
  const again = link({ params: { id: String(program.id) } }).data;
  assert.equal(first.code, again.code);
  assert.equal(first.path, `/tarjeta/${first.code}`);
  const publicForm = form({ params: { code: first.code.toLowerCase() } }).data;
  assert.equal(publicForm.tarjeta.nombre, program.nombre);
  assert.equal(publicForm.activa, true);
  assert.equal(publicForm.tarjeta.metricas, undefined, "no expone métricas del negocio");
});

test("registrarse crea la tarjeta en 0 y repetir el correo devuelve la misma", () => {
  const program = activeProgram();
  const { code } = link({ params: { id: String(program.id) } }).data;
  const created = join({ params: { code }, body: BODY });
  assert.equal(created.status, 201);
  assert.equal(created.data.customerName, "Valeria Ramírez");
  assert.equal(created.data.welcomeEmail, true);
  assert.deepEqual([created.data.card.estampillas, created.data.card.saldo, created.data.card.puntos], [0, 0, 0]);
  assert.match(created.data.card.qrToken, /^FDG-[A-Z]{3}-[A-Z0-9]{6}$/);

  const again = join({ params: { code }, body: { ...BODY, email: "valeria.test@gmail.com" } });
  assert.equal(again.status, 200);
  assert.equal(again.data.alreadyRegistered, true);
  assert.equal(again.data.card.qrToken, created.data.card.qrToken);
  assert.equal(getDatabase().clientes.filter(customer => customer.correo === "valeria.test@gmail.com").length, 1);
  assert.equal(card({ params: { qrToken: created.data.card.qrToken } }).data.estampillas, 0);
  assert.throws(() => wallet({ params: { qrToken: created.data.card.qrToken } }), { status: 503 });
});

test("valida los datos y no acepta registros en tarjetas pausadas", () => {
  const program = activeProgram();
  const { code } = link({ params: { id: String(program.id) } }).data;
  assert.throws(() => join({ params: { code }, body: { ...BODY, email: "otra@gmail.com", lastName: " " } }), { status: 400, message: "Escribe tu apellido." });
  assert.throws(() => join({ params: { code }, body: { ...BODY, email: "otra@gmail.com", birthDate: "2001-02-30" } }), { status: 400 });
  assert.throws(() => join({ params: { code }, body: { ...BODY, email: "otra@" } }), { status: 400 });
  program.estado = "En pausa";
  try {
    assert.throws(() => join({ params: { code }, body: { ...BODY, email: "otra@gmail.com" } }), { status: 400 });
  } finally {
    program.estado = "Activa";
  }
  assert.throws(() => form({ params: { code: "NOEXISTE" } }), { status: 404 });
});
