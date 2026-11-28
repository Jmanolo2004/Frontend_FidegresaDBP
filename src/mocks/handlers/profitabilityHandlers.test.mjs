import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createServer } from "vite";

globalThis.localStorage = { getItem: () => null, setItem: () => {} };
const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
after(() => server.close());

const { getDatabase } = await server.ssrLoadModule("/src/mocks/database.js");
const { previousPeriod, profitabilityHandlers } = await server.ssrLoadModule("/src/mocks/handlers/profitabilityHandlers.js");
const { programHandlers } = await server.ssrLoadModule("/src/mocks/handlers/programHandlers.js");
const { formatLocalDate, parseLocalDate, rangeDates } = await server.ssrLoadModule("/src/utils/metricsDates.js");
const database = getDatabase();
const seedVisits = database.visitas;
const request = query => profitabilityHandlers[0].handler({ query }).data;
const visit = (clienteId, ubicacionId, programaId, tipo, monto, fecha = "2025-03-05T12:00:00") => ({ id: `${clienteId}-${Math.random()}`, clienteId, ubicacionId, programaId, tipo, monto, fecha, premioCanjeado: tipo === "REDEMPTION" });
const totals = ({ recurringCustomers, recurringSales, rewardsCost, returnRatio }) => [recurringCustomers, recurringSales, rewardsCost, returnRatio];
const march = { from: "2025-03-01", to: "2025-03-31" };
const sumCents = (rows, field) => rows.reduce((total, row) => total + Math.round(row[field] * 100), 0);

test("cuadra a mano con las definiciones y los desgloses suman el total", () => {
  database.visitas = [
    // Cliente 1: dos sellos sin monto (2 × 18), uno de 25 y un canje de 4.50.
    visit(1, 1, 1, "STAMP", 0), visit(1, 1, 1, "STAMP", 0), visit(1, 1, 1, "STAMP", 25), visit(1, 1, 1, "REDEMPTION", 0),
    // Cliente 2: dos compras con cashback, en locales distintos, y usa 8 de saldo.
    visit(2, 1, 3, "PURCHASE", 40), visit(2, 2, 3, "PURCHASE", 60), visit(2, 1, 3, "BALANCE_CHARGE", 8),
    // Cliente 3: una sola visita y una consulta, no es recurrente.
    visit(3, 1, 3, "PURCHASE", 500), visit(3, 1, 3, "CONSULT", 0),
    // Cliente 4: paga dos veces con gift card y una visita sin programa.
    visit(4, 1, 7, "BALANCE_CHARGE", 30), visit(4, 1, 7, "BALANCE_CHARGE", 15.5), visit(4, 1, null, "VISIT", 10)
  ];
  const data = request(march);
  // Ventas: 61 + 100 + 55.50 = 216.50. Costo: 4.50 + 8 = 12.50. Retorno: 17.32
  assert.deepEqual(totals(data), [3, 216.5, 12.5, 17.32]);
  assert.deepEqual(totals(data.byProgram.find(row => row.programId === 1)), [1, 61, 4.5, 13.56]);
  assert.deepEqual(totals(data.byProgram.find(row => row.programId === 3)), [1, 100, 8, 12.5]);
  assert.deepEqual(totals(data.byProgram.find(row => row.programId === 7)), [1, 45.5, 0, null]);
  assert.deepEqual(totals(data.byProgram.at(-1)), [1, 10, 0, null]);
  assert.equal(data.byProgram.at(-1).name, "Sin programa");
  for (const field of ["recurringSales", "rewardsCost"]) {
    assert.equal(sumCents(data.byProgram, field), Math.round(data[field] * 100));
    assert.equal(sumCents(data.byBranch, field), Math.round(data[field] * 100));
  }
  // Al filtrar por el local 2, el cliente 2 solo tiene una visita y deja de ser recurrente.
  assert.deepEqual(totals(request({ ...march, branchId: "2" })), [0, 0, 0, null]);
});

test("sin movimientos no hay retorno y compara con el periodo anterior", () => {
  database.visitas = [visit(1, 1, 3, "PURCHASE", 20, "2025-02-10T12:00:00"), visit(1, 1, 3, "PURCHASE", 30, "2025-02-11T12:00:00")];
  const data = request(march);
  assert.deepEqual(totals(data), [0, 0, 0, null]);
  assert.deepEqual(totals(data.previousPeriod), [1, 50, 0, null]);
  assert.deepEqual([data.previousPeriod.from, data.previousPeriod.to], ["2025-02-01", "2025-02-28"]);
});

test("el periodo anterior usa las mismas reglas que el backend", () => {
  const previous = (from, to) => {
    const period = previousPeriod({ from: parseLocalDate(from), to: parseLocalDate(to) });
    return [formatLocalDate(period.from), formatLocalDate(period.to)];
  };
  assert.deepEqual(previous("2026-11-01", "2026-11-24"), ["2026-10-01", "2026-10-24"]);
  assert.deepEqual(previous("2026-11-01", "2026-11-30"), ["2026-10-01", "2026-10-31"]);
  assert.deepEqual(previous("2026-03-01", "2026-03-30"), ["2026-02-01", "2026-02-28"]);
  assert.deepEqual(previous("2026-01-01", "2026-01-15"), ["2025-12-01", "2025-12-15"]);
  assert.deepEqual(previous("2026-11-10", "2026-11-16"), ["2026-11-03", "2026-11-09"]);
});

test("valida fechas y local", () => {
  assert.throws(() => request({ from: "ayer" }), { status: 400 });
  assert.throws(() => request({ from: "2025-02-30", to: "2025-03-01" }), { status: 400 });
  assert.throws(() => request({ from: "2025-03-10", to: "2025-03-01" }), { status: 400 });
  assert.throws(() => request({ from: "1999-12-31", to: "2025-03-01" }), { status: 400 });
  assert.throws(() => request({ branchId: "abc" }), { status: 400 });
  assert.throws(() => request({ branchId: "999" }), { status: 404 });
});

test("los datos de demostración tienen ventas, costos y cuadran", () => {
  database.visitas = seedVisits;
  const data = request(rangeDates("year"));
  assert.ok(data.recurringSales > 0 && data.rewardsCost > 0 && data.returnRatio > 0);
  for (const field of ["recurringSales", "rewardsCost"]) {
    assert.equal(sumCents(data.byProgram, field), Math.round(data[field] * 100));
    assert.equal(sumCents(data.byBranch, field), Math.round(data[field] * 100));
  }
  assert.ok(data.byProgram.every(row => !row.missingRewardCost));
  seedVisits.filter(item => item.programaId).forEach(item => {
    const program = database.tarjetas.find(card => card.id === item.programaId);
    const branch = database.ubicaciones.find(place => place.id === item.ubicacionId);
    assert.equal(program.negocio, branch.nombre);
  });
});

test("guarda, conserva, borra y valida el costo del premio", () => {
  const update = programHandlers.find(handler => handler.method === "put");
  const put = body => update.handler({ params: { id: "2" }, body }).data;
  assert.equal(put({ rewardCost: "5.25" }).rewardCost, 5.25);
  assert.equal(put({ descripcion: "Otra" }).rewardCost, 5.25);
  assert.equal(put({ rewardCost: 0 }).rewardCost, 0);
  assert.equal(put({ rewardCost: null }).rewardCost, null);
  assert.equal(request(march).byProgram.find(row => row.programId === 2).missingRewardCost, true);
  for (const invalid of [-1, 1.234, "abc", 100000]) assert.throws(() => put({ rewardCost: invalid }), { status: 400 });
});
