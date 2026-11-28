import { getDatabase, saveDatabase } from "../database";
import { badRequest, conflict, nextId, notFound, requireText, respond } from "../http";

// Menú público del modo demo: misma forma que PublicMenuDtos del backend (sin productos, igual que la API).
const PREFIX = { Estampillas: "EST", Cashback: "CAS", Niveles: "NIV" };
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CONSENT_VERSION = "2026-11";

export function slugify(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "local";
}

function randomCode(length) {
  return Array.from({ length }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");
}

function branchBySlug(db, slug) {
  const branch = db.ubicaciones.find(place => place.activa !== false && slugify(place.nombre) === slug);
  if (!branch) throw notFound("Este menú no existe o ya no está disponible.");
  return branch;
}

function joinablePrograms(db, branch) {
  return db.tarjetas.filter(card => card.negocio === branch.nombre && card.estado === "Activa" && PREFIX[card.tipo]);
}

function consentText(name) {
  return `Acepto que ${name} use mis datos para gestionar mi tarjeta de fidelización y enviarme sus beneficios, conforme a la Ley N.° 29733 de Protección de Datos Personales. Puedo pedir que los borren cuando quiera.`;
}

function cardInfo(customer, program) {
  customer.qrTokens = customer.qrTokens || {};
  customer.qrTokens[program.id] = customer.qrTokens[program.id] || `FDG-${PREFIX[program.tipo]}-${randomCode(6)}`;
  return {
    qrToken: customer.qrTokens[program.id],
    programId: program.id,
    programName: program.nombre,
    programType: program.tipo,
    primaryColor: program.colores?.primario || null,
    accentColor: program.colores?.acento || null,
    expiresAt: null
  };
}

function inviteLink(customer) {
  customer.codigoReferido = customer.codigoReferido || randomCode(6);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/r/${customer.codigoReferido}`;
}

function lastNineDigits(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits.length >= 9 ? digits.slice(-9) : digits;
}

export const publicMenuHandlers = [
  {
    method: "get",
    path: "/public/menus/:slug",
    handler: ({ params }) => {
      const db = getDatabase();
      const branch = branchBySlug(db, params.slug);
      const programs = joinablePrograms(db, branch);
      const stamps = programs.find(program => program.tipo === "Estampillas") || programs[0];
      return respond({
        slug: params.slug,
        business: { name: branch.nombre, primaryColor: db.configuracion?.colorPrincipal || null },
        branch: { name: branch.nombre, category: branch.categoria, address: branch.direccion, district: branch.distrito, schedule: branch.horario },
        pdf: null,
        webUrl: null,
        invitation: stamps
          ? { title: "Únete y gana tu primer sello", text: "Regístrate en menos de un minuto y recibe tu tarjeta digital para sumar beneficios desde hoy.", buttonLabel: "Quiero mi tarjeta", imageUrl: null, programId: stamps.id }
          : null,
        programs: programs.map(program => ({
          id: program.id,
          name: program.nombre,
          type: program.tipo,
          description: program.descripcion,
          primaryColor: program.colores?.primario || null,
          accentColor: program.colores?.acento || null
        })),
        consent: { version: CONSENT_VERSION, text: consentText(branch.nombre) }
      });
    }
  },
  {
    method: "post",
    path: "/public/menus/:slug/join",
    handler: ({ params, body }) => {
      const db = getDatabase();
      const branch = branchBySlug(db, params.slug);
      if (body.consent !== true) throw badRequest("Debes aceptar el uso de tus datos para unirte al club.");
      const fullName = requireText(body.fullName, "Escribe tu nombre.").slice(0, 120);
      const email = requireText(body.email, "Escribe tu correo.").toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw badRequest("Escribe un correo válido.");
      const phone = lastNineDigits(body.phone);
      if (phone.length !== 9 || !phone.startsWith("9")) throw badRequest("Escribe un celular válido de 9 dígitos.");
      if (body.birthday && !/^(0?[1-9]|[12]\d|3[01])\/(0?[1-9]|1[0-2])$/.test(String(body.birthday).trim())) {
        throw badRequest("Escribe tu cumpleaños como día/mes, por ejemplo 25/12.");
      }
      if (!body.programId) throw badRequest("Elige el programa al que te quieres unir.");
      const program = joinablePrograms(db, branch).find(item => Number(item.id) === Number(body.programId));
      if (!program) throw badRequest("Ese programa no está disponible en este local.");

      const existing = db.clientes.find(customer => customer.correo === email);
      if (existing) {
        if (lastNineDigits(existing.telefono) !== phone) throw conflict("Ya estás registrado en este negocio. Pide tu tarjeta en caja.");
        const response = { alreadyRegistered: true, customerName: existing.nombre, card: cardInfo(existing, program), inviteLink: inviteLink(existing) };
        saveDatabase();
        return respond(response);
      }

      const now = new Date().toISOString();
      const customer = {
        id: nextId(db.clientes),
        nombre: fullName,
        correo: email,
        telefono: `+51 ${phone}`,
        tarjeta: branch.nombre,
        localId: branch.id,
        distrito: branch.distrito,
        latitud: branch.latitud,
        longitud: branch.longitud,
        mapX: branch.mapX + 24,
        mapY: branch.mapY - 18,
        fechaRegistro: now,
        ultimaVisita: now,
        visitas: 0,
        estampillas: 0,
        saldoCashback: 0,
        cumpleanos: body.birthday ? String(body.birthday).trim() : null,
        iniciales: fullName.split(/\s+/).slice(0, 2).map(word => word[0]?.toUpperCase() || "").join(""),
        foto: null,
        estado: "Activa",
        referidoPor: body.referralCode || null
      };
      db.clientes.unshift(customer);
      const response = { alreadyRegistered: false, customerName: fullName, card: cardInfo(customer, program), inviteLink: inviteLink(customer) };
      saveDatabase();
      return respond(response, 201);
    }
  },
  {
    method: "get",
    path: "/public/referrals/:code",
    handler: ({ params }) => {
      const db = getDatabase();
      const code = String(params.code || "").toUpperCase();
      const referrer = db.clientes.find(customer => customer.codigoReferido === code);
      const branch = (referrer && db.ubicaciones.find(place => Number(place.id) === Number(referrer.localId))) || db.ubicaciones[0];
      if (!branch || code.length < 4) throw notFound("Esta invitación no existe o ya no está disponible.");
      return respond({
        code,
        businessName: branch.nombre,
        branchName: branch.nombre,
        menuSlug: slugify(branch.nombre),
        referrerName: (referrer?.nombre || "Lucía").split(" ")[0],
        reward: "1 sello"
      });
    }
  }
];
