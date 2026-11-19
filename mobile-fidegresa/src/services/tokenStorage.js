import * as SecureStore from "expo-secure-store";

const SESSION_KEY = "fidegresa.session";
const BRANCH_KEY = "fidegresa.branch";

/** Sesión en memoria para que el interceptor no lea SecureStore en cada request. */
let cachedSession = null;

export async function loadSession() {
  try {
    const raw = await SecureStore.getItemAsync(SESSION_KEY);
    cachedSession = raw ? JSON.parse(raw) : null;
  } catch {
    cachedSession = null;
  }
  return cachedSession;
}

export async function saveSession(session) {
  cachedSession = session;
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

export async function clearSession() {
  cachedSession = null;
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

export function getAccessToken() {
  return cachedSession?.token ?? null;
}

export async function loadSavedBranchId() {
  try {
    const value = await SecureStore.getItemAsync(BRANCH_KEY);
    return value ? Number(value) : null;
  } catch {
    return null;
  }
}

export async function saveBranchId(branchId) {
  if (branchId == null) await SecureStore.deleteItemAsync(BRANCH_KEY);
  else await SecureStore.setItemAsync(BRANCH_KEY, String(branchId));
}
