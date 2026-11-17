import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createServer } from "vite";

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
const { getDatabase } = await server.ssrLoadModule("/src/mocks/database.js");
const { teamHandlers } = await server.ssrLoadModule("/src/mocks/handlers/teamHandlers.js");
const db = getDatabase();
const owner = { id: 1, email: "owner@example.com", role: "ADMIN" };
const other = { id: 2, email: "other@example.com", role: "ADMIN" };
const handler = (method, path) => teamHandlers.find(item => item.method === method && item.path === path).handler;
const body = { name: "Ana Ejemplo", email: "ANA@example.com", role: "Trabajador", branchIds: [db.ubicaciones[0].id, db.ubicaciones[1].id], currentBranchId: db.ubicaciones[0].id };

test("agrega, actualiza y elimina miembros simulados separados por cuenta", () => {
  const created = handler("post", "/demo/team")({ user: owner, body }).data;
  assert.equal(created.email, "ana@example.com");
  assert.equal(JSON.parse(stored).miembrosEquipo[0].name, "Ana Ejemplo");
  assert.equal(handler("get", "/demo/team")({ user: other }).data.length, 0);
  assert.throws(() => handler("put", "/demo/team/:id")({ user: other, params: { id: created.id }, body }), { status: 404 });
  const updated = handler("put", "/demo/team/:id")({ user: owner, params: { id: created.id }, body: { ...body, role: "Administrador" } }).data;
  assert.equal(updated.role, "Administrador");
  handler("delete", "/demo/team/:id")({ user: owner, params: { id: created.id } });
  assert.equal(handler("get", "/demo/team")({ user: owner }).data.length, 0);
});

test("rechaza datos inválidos y fallos al guardar sin registrar miembros", () => {
  const create = handler("post", "/demo/team");
  assert.throws(() => create({ user: { ...owner, role: "CASHIER" }, body }), { status: 403 });
  assert.throws(() => create({ user: owner, body: { ...body, branchIds: [] } }), { status: 400 });
  assert.throws(() => create({ user: owner, body: { ...body, currentBranchId: 99999 } }), { status: 400 });
  assert.throws(() => create({ user: owner, body: { ...body, email: owner.email } }), { status: 409 });
  failWrite = true;
  assert.throws(() => create({ user: owner, body }), { status: 500 });
  failWrite = false;
  assert.equal(handler("get", "/demo/team")({ user: owner }).data.length, 0);
});
