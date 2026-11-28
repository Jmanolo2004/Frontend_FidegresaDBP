// Libro de Reclamaciones: tipos, textos de cada campo y las mismas validaciones que el backend (ComplaintService).
// Sin React, para probarlo con node --test.

export const COMPLAINT_TYPES = [
  {
    id: "RECLAMO",
    label: "Reclamo",
    description: "Disconformidad con el servicio que contrataste: una función que no responde, un cobro o lo ofrecido en tu plan.",
    detailLabel: "Detalle del reclamo",
    requestLabel: "Pedido: ¿qué solución esperas?"
  },
  {
    id: "QUEJA",
    label: "Queja",
    description: "Malestar con la atención que recibiste, aunque no esté relacionado directamente con el servicio.",
    detailLabel: "Detalle de la queja",
    requestLabel: "Pedido: ¿qué esperas de nosotros?"
  },
  {
    id: "CANCELACION",
    label: "Cancelar mi plan",
    description: "Pide la baja de tu suscripción. Te confirmaremos por correo la fecha en que se hará efectiva.",
    detailLabel: "Motivo de la cancelación",
    requestLabel: "¿Desde cuándo quieres cancelar? Cuéntanos lo que debamos saber"
  },
  {
    id: "COMENTARIO",
    label: "Comentario o sugerencia",
    description: "Cuéntanos qué te gusta de Fidegresa o qué mejorarías. Nos ayuda a construir un mejor servicio.",
    detailLabel: "Tu comentario o sugerencia",
    requestLabel: null
  }
];

export const DOCUMENT_TYPES = [
  { id: "DNI", label: "DNI" },
  { id: "RUC", label: "RUC" },
  { id: "CE", label: "Carné de extranjería" },
  { id: "PASAPORTE", label: "Pasaporte" }
];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function complaintType(id) {
  return COMPLAINT_TYPES.find(type => type.id === id) || null;
}

/** El reclamo y la queja son las hojas formales del libro: piden domicilio y pedido. */
export function isFormal(typeId) {
  return typeId === "RECLAMO" || typeId === "QUEJA";
}

export function cleanDocument(value) {
  return String(value || "").trim().toUpperCase().replace(/[\s-]/g, "");
}

export function validateDocument(type, value) {
  const number = cleanDocument(value);
  if (type === "DNI") return /^\d{8}$/.test(number) ? null : "El DNI debe tener 8 dígitos.";
  if (type === "RUC") return /^(10|15|16|17|20)\d{9}$/.test(number) ? null : "El RUC debe tener 11 dígitos y empezar con 10 o 20.";
  if (type === "CE" || type === "PASAPORTE") return /^[A-Z0-9]{6,12}$/.test(number) ? null : "El documento debe tener entre 6 y 12 letras o números.";
  return "Elige el tipo de documento.";
}

/** Errores por campo, con los mismos mensajes que devuelve el backend. */
export function validateComplaint(values) {
  const errors = {};
  const type = complaintType(values.type);
  if (!type) errors.type = "Elige el tipo de solicitud.";
  if (!values.fullName.trim()) errors.fullName = "Escribe tu nombre completo.";
  const documentError = validateDocument(values.documentType, values.documentNumber);
  if (documentError) errors.documentNumber = documentError;
  if (!EMAIL.test(values.email.trim())) errors.email = "Escribe un correo válido.";
  const phoneDigits = values.phone.replace(/[^\d]/g, "");
  if (values.phone.trim() && (phoneDigits.length < 7 || phoneDigits.length > 15)) errors.phone = "Escribe un teléfono válido.";
  if (isFormal(values.type) && !values.address.trim()) errors.address = "Escribe tu domicilio o el de tu negocio.";
  if (values.type === "RECLAMO" && String(values.amount).trim()) {
    const amount = Number(values.amount);
    if (!Number.isFinite(amount) || amount < 0 || amount > 99999.99) errors.amount = "El monto debe estar entre S/ 0.00 y S/ 99,999.99.";
    else if (!/^\d+(\.\d{1,2})?$/.test(String(values.amount).trim())) errors.amount = "El monto puede tener hasta 2 decimales.";
  }
  if (values.detail.trim().length < 10) errors.detail = values.detail.trim() ? "Cuéntanos el detalle con un poco más de información." : "Cuéntanos el detalle.";
  if (type?.requestLabel && !values.request.trim()) errors.request = "Escribe qué solicitas.";
  if (!values.consent) errors.consent = "Acepta el tratamiento de tus datos para registrar tu solicitud.";
  return errors;
}

/** Cuerpo que espera POST /public/complaints. */
export function complaintPayload(values) {
  const type = complaintType(values.type);
  return {
    type: values.type,
    fullName: values.fullName.trim(),
    documentType: values.documentType,
    documentNumber: cleanDocument(values.documentNumber),
    email: values.email.trim().toLowerCase(),
    phone: values.phone.trim() || null,
    address: values.address.trim() || null,
    businessName: values.businessName.trim() || null,
    planId: values.planId || null,
    amount: values.type === "RECLAMO" && String(values.amount).trim() ? Number(values.amount) : null,
    detail: values.detail.trim(),
    request: type?.requestLabel ? values.request.trim() : null,
    consent: values.consent === true
  };
}
