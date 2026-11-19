import { apiClient } from "./apiClient";

/** POST /auth/login → { token, type, email } */
export async function login({ email, password }) {
  const { data } = await apiClient.post("/auth/login", { email: email.trim().toLowerCase(), password }, { skipAuth: true });
  if (!data?.token) throw new Error("El servidor no devolvió un token.");
  return { token: data.token, email: data.email || email.trim().toLowerCase() };
}

/** GET /auth/me: confirma que el token guardado sigue siendo válido. */
export async function verifySession({ signal } = {}) {
  await apiClient.get("/auth/me", { signal });
}
