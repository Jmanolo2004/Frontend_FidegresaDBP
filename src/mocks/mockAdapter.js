import { AxiosError, CanceledError } from "axios";
import { HttpError } from "./http";
import { authHandlers, userFromAuthorization } from "./handlers/authHandlers";
import { metricsHandlers } from "./handlers/metricsHandlers";
import { customerHandlers } from "./handlers/customerHandlers";
import { reviewHandlers } from "./handlers/reviewHandlers";
import { programHandlers } from "./handlers/programHandlers";
import { branchHandlers } from "./handlers/branchHandlers";
import { geoHandlers } from "./handlers/geoHandlers";
import { settingsHandlers } from "./handlers/settingsHandlers";

/*
 * Servidor de demostración: responde con la misma forma que el backend REST
 * (rutas /api/v1, páginas tipo Spring y ErrorResponseDto). Se activa con
 * VITE_USE_MOCK=true y permite presentar el frontend aunque el backend esté apagado.
 */
const routes = [
  ...authHandlers,
  ...metricsHandlers,
  ...customerHandlers,
  ...reviewHandlers,
  ...programHandlers,
  ...branchHandlers,
  ...geoHandlers,
  ...settingsHandlers
].map(route => ({
  ...route,
  matcher: new RegExp(`^${route.path.replace(/:(\w+)/g, "(?<$1>[^/]+)")}$`)
}));

const STATUS_TEXT = { 200: "OK", 201: "Created", 204: "No Content", 400: "Bad Request", 401: "Unauthorized", 403: "Forbidden", 404: "Not Found", 409: "Conflict", 500: "Internal Server Error" };

function wait(milliseconds, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, milliseconds);
    signal?.addEventListener?.("abort", () => {
      clearTimeout(timer);
      reject(new CanceledError());
    });
  });
}

function parseBody(data) {
  if (!data) return {};
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  }
  return data;
}

function buildResponse(config, status, data) {
  return { data, status, statusText: STATUS_TEXT[status] || "", headers: { "content-type": "application/json" }, config, request: {} };
}

function errorResponse(config, status, message, path) {
  const response = buildResponse(config, status, {
    timestamp: new Date().toISOString(),
    status,
    error: STATUS_TEXT[status] || "Error",
    message,
    path: `/api/v1${path}`
  });
  return new AxiosError(message, status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST, config, {}, response);
}

export async function mockAdapter(config) {
  if (config.signal?.aborted) throw new CanceledError();
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new AxiosError("Network Error", AxiosError.ERR_NETWORK, config, {});
  }
  await wait(220 + Math.random() * 380, config.signal);

  const method = (config.method || "get").toLowerCase();
  const url = new URL(config.url, "http://demo.local");
  const path = url.pathname.replace(/^\/api\/v1/, "");
  const query = { ...Object.fromEntries(url.searchParams), ...(config.params || {}) };
  const route = routes.find(item => item.method === method && item.matcher.test(path));

  if (!route) throw errorResponse(config, 404, "Recurso no encontrado.", path);

  const authorization = config.headers?.Authorization || config.headers?.authorization;
  const user = route.auth ? userFromAuthorization(authorization) : null;
  if (route.auth && !user) throw errorResponse(config, 401, "Tu sesión expiró. Vuelve a iniciar sesión.", path);

  try {
    const { data, status } = route.handler({
      params: path.match(route.matcher).groups || {},
      query,
      body: parseBody(config.data),
      user
    });
    return buildResponse(config, status, structuredClone(data));
  } catch (error) {
    if (error instanceof HttpError) throw errorResponse(config, error.status, error.message, path);
    throw errorResponse(config, 500, "Ocurrió un error inesperado en el servidor.", path);
  }
}
