/*
 * El token de acceso vive en memoria y en sessionStorage (se borra al cerrar la pestaña).
 * No se usa localStorage para evitar que el token persista indefinidamente en el equipo.
 * En producción lo ideal es que el backend emita el refresh token en una cookie httpOnly.
 */
const SESSION_KEY = "fidegresa-session";

let session = null;

function readStoredSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

export const tokenStorage = {
  get() {
    if (!session) session = readStoredSession();
    return session;
  },
  getAccessToken() {
    return this.get()?.token || null;
  },
  getRefreshToken() {
    return this.get()?.refreshToken || null;
  },
  set(nextSession) {
    session = nextSession;
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
    } catch {
      // Si el navegador bloquea el almacenamiento, la sesión sigue en memoria.
    }
  },
  clear() {
    session = null;
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // Sin acción: no había nada guardado.
    }
  }
};
