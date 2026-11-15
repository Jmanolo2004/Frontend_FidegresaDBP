import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
after(() => server.close());
const { MetricsTrendChart } = await server.ssrLoadModule("/src/components/metrics/MetricsVisuals.jsx");

test("cada periodo permite consultar las tres métricas con el teclado", () => {
  const html = renderToStaticMarkup(createElement(MetricsTrendChart, { series: { items: [
    { label: "Enero", clientesRecurrentes: 2, visitas: 10, transacciones: 8 },
    { label: "Febrero", clientesRecurrentes: 3, visitas: 12, transacciones: 9 }
  ] } }));
  assert.match(html, /Enero: Clientes recurrentes: 2, Total escaneos: 10, Transacciones totales: 8/);
  assert.match(html, /Febrero: Clientes recurrentes: 3, Total escaneos: 12, Transacciones totales: 9/);
  assert.equal((html.match(/tabindex="0"/g) || []).length, 2);
});

test("los datos faltantes no se representan como cero ni conectan periodos", () => {
  const html = renderToStaticMarkup(createElement(MetricsTrendChart, { series: { items: [
    { label: "Enero", clientesRecurrentes: 2, visitas: 10, transacciones: 8 },
    { label: "Febrero", clientesRecurrentes: 0, visitas: 12, transacciones: null },
    { label: "Marzo", clientesRecurrentes: 1, visitas: 11, transacciones: 9 }
  ] } }));
  assert.match(html, /Febrero: Clientes recurrentes: 0, Total escaneos: 12, Transacciones totales: —/);
  assert.equal((html.match(/<path[^>]*stroke="#326ef4"/g) || []).length, 2);
  assert.doesNotMatch(html, /NaN/);
});
