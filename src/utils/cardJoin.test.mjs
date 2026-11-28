import { test } from "node:test";
import assert from "node:assert/strict";
import { birthDateOf, previewName, validateJoin } from "./cardJoin.js";

const VALID = { firstName: "Valeria", lastName: "Ramírez", email: "valeria@gmail.com", day: "25", month: "7", year: "1998" };

test("birthDateOf arma AAAA-MM-DD y rechaza fechas que no existen o futuras", () => {
  assert.equal(birthDateOf({ day: "25", month: "7", year: "1998" }), "1998-07-25");
  assert.equal(birthDateOf({ day: "29", month: "2", year: "2024" }), "2024-02-29");
  assert.equal(birthDateOf({ day: "29", month: "2", year: "2023" }), null);
  assert.equal(birthDateOf({ day: "31", month: "4", year: "2000" }), null);
  assert.equal(birthDateOf({ day: "1", month: "1", year: String(new Date().getFullYear() + 1) }), null);
  assert.equal(birthDateOf({ day: "", month: "1", year: "2000" }), null);
});

test("validateJoin pide nombre, apellido, correo válido y fecha completa", () => {
  assert.deepEqual(validateJoin(VALID), {});
  const errors = validateJoin({ ...VALID, firstName: " ", lastName: "", email: "valeria@", day: "" });
  assert.deepEqual(Object.keys(errors).sort(), ["birthDate", "email", "firstName", "lastName"]);
  assert.equal(validateJoin({ ...VALID, day: "31", month: "2" }).birthDate, "Esa fecha no existe. Revisa el día y el mes.");
});

test("previewName muestra el nombre con la inicial del apellido", () => {
  assert.equal(previewName("", ""), "Tu nombre");
  assert.equal(previewName("valeria sofía", ""), "valeria");
  assert.equal(previewName("Valeria", "ramírez"), "Valeria R.");
});
