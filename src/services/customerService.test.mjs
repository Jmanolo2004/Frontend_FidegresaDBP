import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createServer } from "vite";

const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
after(() => server.close());

const { apiClient } = await server.ssrLoadModule("/src/api/apiClient.js");
const { customerService } = await server.ssrLoadModule("/src/services/customerService.js");

test("exporta todas las páginas con los filtros y el orden seleccionados", async () => {
  const calls = [];
  apiClient.get = async (url, { params }) => {
    calls.push({ url, ...params });
    const start = params.page * 100;
    return { data: { content: Array.from({ length: params.page ? 3 : 100 }, (_, index) => ({ id: start + index })), totalPages: 2 } };
  };
  const customers = await customerService.getAllForExport({ search: "café", status: "Activa", sort: "name" });
  assert.equal(customers.length, 103);
  assert.equal(customers[102].id, 102);
  assert.deepEqual(calls.map(call => call.page), [0, 1]);
  assert.ok(calls.every(call => call.url === "/customers" && call.search === "café" && call.status === "Activa" && call.sort === "name"));
});

test("no devuelve una lista parcial cuando falla una página", async () => {
  apiClient.get = async (_url, { params }) => {
    if (params.page === 1) throw new Error("Error de conexión");
    return { data: { content: [{ id: 1 }], totalPages: 2 } };
  };
  await assert.rejects(customerService.getAllForExport({}), /Error de conexión/);
});
