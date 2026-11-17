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
const { getDatabase, resetDatabase } = await server.ssrLoadModule("/src/mocks/database.js");
const { branchHandlers } = await server.ssrLoadModule("/src/mocks/handlers/branchHandlers.js");
const { authHandlers } = await server.ssrLoadModule("/src/mocks/handlers/authHandlers.js");
const { subscriptionHandlers } = await server.ssrLoadModule("/src/mocks/handlers/subscriptionHandlers.js");
const handler = (handlers, method, path) => handlers.find(item => item.method === method && item.path === path).handler;
const createBranch = handler(branchHandlers, "post", "/branches");
const updateBranch = handler(branchHandlers, "put", "/branches/:id");
const toggleBranch = handler(branchHandlers, "patch", "/branches/:id/status");
const upgrade = handler(subscriptionHandlers, "post", "/demo/subscription/upgrade");
const register = handler(authHandlers, "post", "/auth/register");
const owner = { id: 1, email: "owner@example.com", role: "ADMIN" };
const branch = { nombre: "Nuevo local", categoria: "Cafetería", direccion: "Calle 123", distrito: "Miraflores" };
const registration = { businessName: "Negocio nuevo", category: "Cafetería", district: "Miraflores", firstName: "Ana", lastName: "Ejemplo", email: "ana@example.com", password: "Clave123", planId: "emprende", simulatedPaymentConfirmed: true };

test("conserva los cinco locales existentes con Emprende y permite editar y pausar", () => {
  const db = resetDatabase();
  assert.equal(db.configuracion.plan, "Emprende");
  assert.equal(db.ubicaciones.length, 5);
  assert.throws(() => createBranch({ body: branch }), { status: 422 });
  const first = db.ubicaciones[0];
  updateBranch({ params: { id: first.id }, body: { ...first, nombre: "Local editado" } });
  toggleBranch({ params: { id: first.id }, body: { activa: false } });
  assert.equal(db.ubicaciones.length, 5);
  assert.equal(db.ubicaciones[0].nombre, "Local editado");
  assert.equal(db.ubicaciones[0].activa, false);
});

test("aplica los límites exactos de cada plan contando locales pausados", () => {
  for (const [plan, limit] of [["Emprende", 2], ["Crece", 5], ["Avanza", 15]]) {
    const db = resetDatabase();
    db.configuracion.plan = plan;
    db.ubicaciones = Array.from({ length: limit - 1 }, (_, index) => ({ id: index + 1, nombre: `Local ${index}`, activa: false }));
    assert.equal(createBranch({ body: branch }).status, 201);
    assert.equal(db.ubicaciones.length, limit);
    assert.equal(JSON.parse(stored).ubicaciones.length, limit);
    assert.throws(() => createBranch({ body: { ...branch, nombre: "Otro local" } }), error => {
      assert.equal(error.status, 422);
      assert.match(error.message, plan === "Avanza" ? /plan máximo/ : /Mejora tu plan/);
      return true;
    });
  }
});

test("mejora secuencialmente solo con confirmación y revierte fallos de persistencia", () => {
  const db = resetDatabase();
  assert.throws(() => upgrade({ user: owner, body: { planId: "avanza", confirmed: true } }), { status: 400 });
  assert.throws(() => upgrade({ user: owner, body: { planId: "crece" } }), { status: 400 });
  assert.throws(() => upgrade({ user: { ...owner, role: "CASHIER" }, body: { planId: "crece", confirmed: true } }), { status: 403 });
  failWrite = true;
  assert.throws(() => upgrade({ user: owner, body: { planId: "crece", confirmed: true } }), { status: 500 });
  failWrite = false;
  assert.equal(db.configuracion.plan, "Emprende");
  assert.equal(upgrade({ user: owner, body: { planId: "crece", confirmed: true } }).data.plan, "Crece");
  assert.throws(() => createBranch({ body: branch }), { status: 422 });
  assert.equal(upgrade({ user: owner, body: { planId: "avanza", confirmed: true } }).data.plan, "Avanza");
  assert.equal(JSON.parse(stored).configuracion.plan, "Avanza");
  assert.equal(createBranch({ body: branch }).status, 201);
  assert.throws(() => upgrade({ user: owner, body: { planId: "avanza", confirmed: true } }), { status: 400 });
});

test("registro exige confirmación, conserva locales excedidos y aplica el plan seleccionado", () => {
  const db = resetDatabase();
  assert.throws(() => register({ body: { ...registration, planId: "" } }), { status: 400 });
  assert.throws(() => register({ body: { ...registration, simulatedPaymentConfirmed: false } }), { status: 400 });
  const result = register({ body: registration });
  assert.equal(result.data.locationNotCreated, true);
  assert.equal(db.ubicaciones.length, 5);
  assert.equal(db.configuracion.plan, "Emprende");
  const second = register({ body: { ...registration, email: "otra@example.com", businessName: "Otro negocio", planId: "avanza" } });
  assert.equal(second.data.locationNotCreated, false);
  assert.equal(db.configuracion.plan, "Avanza");
  assert.equal(db.ubicaciones.length, 6);
  assert.equal(JSON.parse(stored).configuracion.plan, "Avanza");
});

test("revierte la creación de local y cuenta si no se puede guardar", () => {
  const db = resetDatabase();
  db.configuracion.plan = "Avanza";
  const previous = structuredClone(db);
  failWrite = true;
  assert.throws(() => createBranch({ body: branch }), { status: 500 });
  assert.equal(db.ubicaciones.length, previous.ubicaciones.length);
  assert.throws(() => register({ body: { ...registration, email: "error@example.com", planId: "crece" } }), { status: 500 });
  assert.deepEqual(db.configuracion, previous.configuracion);
  assert.deepEqual(db.ubicaciones, previous.ubicaciones);
  assert.deepEqual(db.usuarios, previous.usuarios);
  failWrite = false;
});
