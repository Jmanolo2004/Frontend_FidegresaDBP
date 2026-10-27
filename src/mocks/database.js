import { createSeedData } from "./seedData";

const STORAGE_KEY = "fidegresa-demo-db-v3";
const DEMO_USER = {
  id: 1,
  email: "maria@fidegresa.com",
  passwordHash: hashPassword("Fidegresa2026"),
  fullName: "María González",
  role: "ADMIN",
  provider: "password"
};

let database = null;

// Hash simple (no criptográfico) para no guardar contraseñas en texto plano dentro del modo demo.
export function hashPassword(password) {
  let hash = 5381;
  for (const character of String(password)) hash = (hash * 33) ^ character.charCodeAt(0);
  return `h${(hash >>> 0).toString(36)}`;
}

function freshDatabase(users = [DEMO_USER]) {
  return { ...createSeedData(), usuarios: users, refreshTokens: [] };
}

function isValidShape(value) {
  return (
    value?.schemaVersion === 2 &&
    Array.isArray(value.clientes) &&
    Array.isArray(value.visitas) &&
    Array.isArray(value.ubicaciones) &&
    Array.isArray(value.tarjetas) &&
    Array.isArray(value.resenas) &&
    Array.isArray(value.usuarios)
  );
}

export function getDatabase() {
  if (database) return database;
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    database = isValidShape(saved) ? saved : freshDatabase();
  } catch {
    database = freshDatabase();
  }
  return database;
}

export function saveDatabase() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
  } catch {
    // El modo demo sigue funcionando en memoria si el navegador bloquea el almacenamiento.
  }
}

export function resetDatabase() {
  const users = getDatabase().usuarios;
  database = freshDatabase(users);
  saveDatabase();
  return database;
}
