import assert from "node:assert/strict";
import { test } from "node:test";
import { calendarDays, customRangeDates, inclusiveDayCount, rangeDates, shiftMonth } from "./metricsDates.js";

test("los rangos rápidos incluyen el día actual y manejan años bisiestos", () => {
  const now = new Date(2024, 2, 1, 15);
  assert.deepEqual(rangeDates("today", now), { from: "2024-03-01", to: "2024-03-01" });
  assert.deepEqual(rangeDates("7days", now), { from: "2024-02-24", to: "2024-03-01" });
  assert.deepEqual(rangeDates("14days", now), { from: "2024-02-17", to: "2024-03-01" });
  assert.deepEqual(rangeDates("month", now), { from: "2024-03-01", to: "2024-03-01" });
  assert.deepEqual(rangeDates("year", now), { from: "2024-01-01", to: "2024-03-01" });
  assert.equal(inclusiveDayCount("2024-02-28", "2024-03-01"), 3);
});

test("el calendario comienza en lunes y navega correctamente entre años", () => {
  const december = new Date(2024, 11, 1);
  const days = calendarDays(december);
  assert.equal(days[0].value, "2024-11-25");
  assert.equal(days.find(day => day.value === "2024-12-01").inMonth, true);
  assert.equal(days.find(day => day.value === "2025-01-01").inMonth, false);
  assert.equal(shiftMonth(december, 1).getFullYear(), 2025);
  assert.equal(shiftMonth(december, 1).getMonth(), 0);
});

test("el rango personalizado valida fechas y ordena los extremos", () => {
  assert.deepEqual(customRangeDates("2024-03-01", "2024-02-29"), { from: "2024-02-29", to: "2024-03-01" });
  assert.deepEqual(customRangeDates("2024-02-29", "2024-02-29"), { from: "2024-02-29", to: "2024-02-29" });
  for (const [from, to] of [["abc", "xyz"], ["2024-02-30", "2024-03-01"], ["2024-01", "2024-02"], [null, "2024-02-01"]]) {
    assert.equal(customRangeDates(from, to), null);
  }
});
