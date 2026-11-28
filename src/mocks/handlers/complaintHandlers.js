import { badRequest, respond } from "../http";
import { complaintType, validateComplaint } from "../../utils/complaints";

// Libro de Reclamaciones en el modo demo: valida igual que el backend y devuelve un número de hoja.
let counter = 0;

function addBusinessDays(from, days) {
  const date = new Date(from);
  let added = 0;
  while (added < days) {
    date.setDate(date.getDate() + 1);
    if (date.getDay() !== 0 && date.getDay() !== 6) added += 1;
  }
  return date.toISOString().slice(0, 10);
}

export const complaintHandlers = [
  {
    method: "post",
    path: "/public/complaints",
    handler: ({ body }) => {
      const values = {
        type: body.type || "", fullName: body.fullName || "", documentType: body.documentType || "", documentNumber: body.documentNumber || "",
        email: body.email || "", phone: body.phone || "", address: body.address || "", businessName: body.businessName || "",
        planId: body.planId || "", amount: body.amount ?? "", detail: body.detail || "", request: body.request || "", consent: body.consent === true
      };
      const errors = Object.values(validateComplaint(values));
      if (errors.length) throw badRequest(errors[0]);
      counter += 1;
      const now = new Date();
      return respond({
        code: `${now.getFullYear()}-${String(counter).padStart(6, "0")}`,
        type: values.type,
        typeLabel: complaintType(values.type).id === "CANCELACION" ? "Solicitud de cancelación" : complaintType(values.type).label,
        createdAt: now.toISOString(),
        responseDueBy: addBusinessDays(now, 15),
        email: values.email.trim().toLowerCase()
      }, 201);
    }
  }
];
