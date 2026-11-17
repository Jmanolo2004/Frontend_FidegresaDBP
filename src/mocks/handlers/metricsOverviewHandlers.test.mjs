import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createServer } from "vite";

globalThis.localStorage = { getItem: () => null };
const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
after(() => server.close());

const { getDatabase } = await server.ssrLoadModule("/src/mocks/database.js");
const { metricsOverviewHandlers } = await server.ssrLoadModule("/src/mocks/handlers/metricsOverviewHandlers.js");
const database = getDatabase();
database.clientes.forEach(customer => { customer.fechaRegistro = "2000-01-01T12:00:00"; });
database.clientes[0].fechaRegistro = "2025-03-05T12:00:00";
database.clientes[1].fechaRegistro = "2025-03-12T12:00:00";
database.visitas = [
  { id: "1-1", clienteId: database.clientes[0].id, ubicacionId: database.clientes[0].localId, fecha: "2025-03-05T12:00:00", monto: 42, premioCanjeado: false },
  { id: "2-1", clienteId: database.clientes[1].id, ubicacionId: database.clientes[1].localId, fecha: "2025-03-12T12:00:00", monto: 80, premioCanjeado: false }
];
const overview = metricsOverviewHandlers.find(handler => handler.path === "/metrics/overview");

for (const interval of ["week", "month"]) {
  test(`el último intervalo ${interval} respeta la fecha final seleccionada`, () => {
    const { data } = overview.handler({ query: { from: "2025-03-01", to: "2025-03-10", program: "all", interval } });
    assert.equal(data.series.items.reduce((sum, item) => sum + item.clientesNuevos, 0), 1);
    assert.equal(data.series.items.reduce((sum, item) => sum + item.ventas, 0), 42);
  });
}

test("la actividad muestra importes reales para todos los programas y conserva los eventos sin compra", () => {
  const activity = metricsOverviewHandlers.find(handler => handler.path === "/metrics/activity");
  database.visitas = [
    { id: "1-1", clienteId: database.clientes[0].id, ubicacionId: database.clientes[0].localId, fecha: "2025-03-05T12:00:00", monto: 42, premioCanjeado: false },
    { id: "2-1", clienteId: database.clientes[1].id, ubicacionId: database.clientes[1].localId, fecha: "2025-03-06T12:00:00", monto: 80, premioCanjeado: false },
    { id: "1-2", clienteId: database.clientes[0].id, ubicacionId: database.clientes[0].localId, fecha: "2025-03-07T12:00:00", monto: 0, premioCanjeado: false },
    { id: "1-3", clienteId: database.clientes[0].id, ubicacionId: database.clientes[0].localId, fecha: "2025-03-08T12:00:00", monto: 0, premioCanjeado: true },
    { id: "1-4", clienteId: database.clientes[0].id, ubicacionId: database.clientes[0].localId, fecha: "2025-03-09T12:00:00", premioCanjeado: false }
  ];
  const { data } = activity.handler({ query: { from: "2025-03-01", to: "2025-03-10", size: 100 } });
  const byId = Object.fromEntries(data.content.map(item => [item.id, item]));
  assert.equal(byId["1-1"].event, "+1 sello");
  assert.equal(byId["1-1"].amount, 42);
  assert.equal(byId["2-1"].amount, 80);
  assert.equal(byId["1-2"].amount, 0);
  assert.equal(byId["1-3"].amount, 0);
  assert.equal(byId["1-4"].amount, null);
  assert.equal(byId[`registration-${database.clientes[0].id}`].amount, null);
});
