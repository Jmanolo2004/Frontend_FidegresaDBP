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
