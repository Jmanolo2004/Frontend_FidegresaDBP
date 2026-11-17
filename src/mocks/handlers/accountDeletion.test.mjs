import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { after, test } from "node:test";
import { createServer } from "vite";

globalThis.crypto ||= webcrypto;
let stored;
let failWrite = false;
globalThis.localStorage = {
  getItem: () => stored || null,
  setItem: (_, value) => {
    if (failWrite) throw new Error("storage blocked");
    stored = value;
  }
};

const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
after(() => server.close());
let storageListener;
globalThis.window = { addEventListener: (type, listener) => { if (type === "storage") storageListener = listener; } };
const { getDatabase } = await server.ssrLoadModule("/src/mocks/database.js");
delete globalThis.window;
const { authHandlers, userFromAuthorization } = await server.ssrLoadModule("/src/mocks/handlers/authHandlers.js");
const handler = (method, path) => authHandlers.find(item => item.method === method && item.path === path).handler;
const login = handler("post", "/auth/login");
const remove = handler("delete", "/demo/account");
const register = handler("post", "/auth/register");
const refresh = handler("post", "/auth/refresh");

test("al eliminar una cuenta se conservan datos compartidos y se revocan sus sesiones", () => {
  const db = getDatabase();
  const session = login({ body: { email: "maria@fidegresa.com", password: "Fidegresa2026" } }).data;
  const user = userFromAuthorization(`Bearer ${session.token}`);
  const locations = structuredClone(db.ubicaciones);
  const customers = structuredClone(db.clientes);
  const settings = structuredClone(db.configuracion);

  failWrite = true;
  assert.throws(() => remove({ user }), { status: 500 });
  failWrite = false;
  assert.equal(userFromAuthorization(`Bearer ${session.token}`), user);
  assert.ok(db.refreshTokens.some(item => item.token === session.refreshToken));

  assert.equal(remove({ user }).status, 204);
  assert.equal(userFromAuthorization(`Bearer ${session.token}`), null);
  assert.throws(() => refresh({ body: { refreshToken: session.refreshToken } }), { status: 401 });
  assert.deepEqual(db.ubicaciones, locations);
  assert.deepEqual(db.clientes, customers);
  assert.deepEqual(db.configuracion, settings);
  assert.ok(!JSON.parse(stored).usuarios.some(item => item.email === user.email));

  const newSession = register({ body: {
    email: user.email, password: "OtraClave123", firstName: "Nueva", lastName: "Cuenta",
    businessName: locations[0].nombre, district: locations[0].distrito,
    category: locations[0].categoria, planId: "avanza", simulatedPaymentConfirmed: true
  } }).data;
  assert.equal(userFromAuthorization(`Bearer ${session.token}`), null);
  assert.equal(userFromAuthorization(`Bearer ${newSession.token}`).email, user.email);
});

test("los cambios de otra pestaña invalidan la base simulada en memoria", () => {
  const previous = getDatabase();
  const changed = JSON.parse(stored);
  changed.usuarios = [];
  stored = JSON.stringify(changed);
  storageListener({ key: "fidegresa-demo-db-v8" });
  assert.notEqual(getDatabase(), previous);
  assert.deepEqual(getDatabase().usuarios, []);
});
