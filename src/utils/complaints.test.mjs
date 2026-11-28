import { test } from "node:test";
import assert from "node:assert/strict";
import { complaintPayload, validateComplaint, validateDocument } from "./complaints.js";

const VALID = {
  type: "RECLAMO", fullName: "Rosa Vega", documentType: "RUC", documentNumber: "20123456789", email: "rosa@cafe.pe", phone: "",
  address: "Av. Larco 812", businessName: "Café de la Plaza", planId: "crece", amount: "", detail: "No llegan los correos de bienvenida.",
  request: "Que lo revisen.", consent: true
};

test("valida los documentos peruanos", () => {
  assert.equal(validateDocument("DNI", "4567 8901"), null);
  assert.equal(validateDocument("DNI", "1234567"), "El DNI debe tener 8 dígitos.");
  assert.equal(validateDocument("RUC", "20-123456789"), null);
  assert.equal(validateDocument("RUC", "99123456789"), "El RUC debe tener 11 dígitos y empezar con 10 o 20.");
  assert.equal(validateDocument("CE", "x12345"), null);
  assert.equal(validateDocument("", "123"), "Elige el tipo de documento.");
});

test("el reclamo pide domicilio y pedido; el comentario no", () => {
  assert.deepEqual(validateComplaint(VALID), {});
  assert.deepEqual(Object.keys(validateComplaint({ ...VALID, address: "", request: " ", consent: false })).sort(), ["address", "consent", "request"]);
  assert.deepEqual(validateComplaint({ ...VALID, type: "COMENTARIO", address: "", request: "" }), {});
  assert.deepEqual(Object.keys(validateComplaint({ ...VALID, type: "CANCELACION", address: "", request: "" })), ["request"]);
  assert.equal(validateComplaint({ ...VALID, amount: "1.234" }).amount, "El monto puede tener hasta 2 decimales.");
  assert.equal(validateComplaint({ ...VALID, detail: "Mal" }).detail, "Cuéntanos el detalle con un poco más de información.");
  assert.equal(validateComplaint({ ...VALID, type: "" }).type, "Elige el tipo de solicitud.");
});

test("arma el cuerpo para el backend sin campos que no aplican", () => {
  const body = complaintPayload({ ...VALID, email: " Rosa@Cafe.PE ", amount: "49.90", documentNumber: "20 123456789" });
  assert.equal(body.email, "rosa@cafe.pe");
  assert.equal(body.amount, 49.9);
  assert.equal(body.documentNumber, "20123456789");
  assert.equal(body.phone, null);
  const comment = complaintPayload({ ...VALID, type: "COMENTARIO", amount: "10" });
  assert.equal(comment.request, null);
  assert.equal(comment.amount, null);
});
