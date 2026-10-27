import { isCancel } from "axios";

const MESSAGES_BY_STATUS = {
  400: "Revisa los datos ingresados e inténtalo otra vez.",
  401: "Tu sesión expiró. Vuelve a iniciar sesión.",
  403: "No tienes permiso para realizar esta acción.",
  404: "No encontramos lo que buscabas.",
  409: "Ya existe un registro con esos datos.",
  422: "Algunos datos no son válidos.",
  429: "Hiciste muchas solicitudes seguidas. Espera un momento.",
  500: "Tuvimos un problema en el servidor. Inténtalo en unos minutos.",
  502: "El servidor no está disponible. Inténtalo en unos minutos.",
  503: "El servicio está en mantenimiento. Inténtalo en unos minutos."
};

export class ApiError extends Error {
  constructor({ message, status = 0, code = "UNKNOWN", details = null }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  get isNetworkError() {
    return this.code === "NETWORK";
  }

  get isRetryable() {
    return this.code === "NETWORK" || this.code === "TIMEOUT" || this.status >= 500;
  }
}

export function toApiError(error) {
  if (error instanceof ApiError) return error;
  if (isCancel(error)) return new ApiError({ message: "Solicitud cancelada.", code: "CANCELED" });
  if (error?.code === "ECONNABORTED" || error?.code === "ETIMEDOUT") {
    return new ApiError({ message: "El servidor tardó demasiado en responder. Inténtalo de nuevo.", code: "TIMEOUT" });
  }
  if (!error?.response) {
    return new ApiError({ message: "No pudimos conectar con Fidegresa. Revisa tu conexión a internet.", code: "NETWORK" });
  }
  const { status, data } = error.response;
  const serverMessage = typeof data?.message === "string" && data.message.trim() ? data.message : null;
  const message = status >= 500 ? MESSAGES_BY_STATUS[status] || MESSAGES_BY_STATUS[500] : serverMessage || MESSAGES_BY_STATUS[status] || "Ocurrió un error inesperado.";
  return new ApiError({ message, status, code: `HTTP_${status}`, details: data });
}

export function isCanceledError(error) {
  return error?.code === "CANCELED" || isCancel(error);
}
