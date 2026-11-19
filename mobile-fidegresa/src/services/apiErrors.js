import { isCancel } from "axios";

/** Mensajes para el cajero según el código HTTP: nada técnico. */
const MESSAGES_BY_STATUS = {
  400: "Revisa los datos ingresados e inténtalo otra vez.",
  401: "Tu sesión expiró. Vuelve a iniciar sesión.",
  403: "Tu usuario no tiene permiso para hacer esta acción.",
  404: "No encontramos lo que buscabas.",
  409: "La operación no se pudo completar porque la tarjeta cambió. Actualiza e inténtalo de nuevo.",
  422: "Los datos no son válidos para esta tarjeta.",
  429: "Hiciste demasiados intentos. Espera unos segundos.",
  500: "El servidor tuvo un problema. Inténtalo en unos minutos.",
  502: "El servidor no está disponible en este momento.",
  503: "El servidor está en mantenimiento. Inténtalo en unos minutos.",
  504: "El servidor tardó demasiado en responder."
};

export const NETWORK_MESSAGE = "Sin conexión con el servidor. Revisa tu internet o la URL del backend.";
export const TIMEOUT_MESSAGE = "La conexión tardó demasiado. Inténtalo de nuevo.";

/** Error de la API ya normalizado: status, mensaje amigable y si vale la pena reintentar. */
export class ApiError extends Error {
  constructor({ status = 0, message, kind = "http", details = null }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.kind = kind; // "http" | "network" | "timeout" | "canceled"
    this.details = details;
  }

  get isRetryable() {
    return this.kind === "network" || this.kind === "timeout" || this.status >= 500 || this.status === 429;
  }
}

/** Convierte cualquier error de axios en un ApiError con mensaje en español. */
export function toApiError(error) {
  if (error instanceof ApiError) return error;
  if (isCancel(error)) return new ApiError({ kind: "canceled", message: "Solicitud cancelada." });

  if (error?.code === "ECONNABORTED" || error?.code === "ETIMEDOUT") {
    return new ApiError({ kind: "timeout", message: TIMEOUT_MESSAGE });
  }

  const response = error?.response;
  if (!response) return new ApiError({ kind: "network", message: NETWORK_MESSAGE });

  const { status, data } = response;
  // El backend responde con ErrorResponseDto { status, error, message, path }.
  const backendMessage = typeof data?.message === "string" && data.message.trim() ? data.message.trim() : null;
  const useBackendMessage = backendMessage && status >= 400 && status < 500 && status !== 401;
  return new ApiError({
    status,
    message: useBackendMessage ? backendMessage : MESSAGES_BY_STATUS[status] || "Ocurrió un error inesperado.",
    details: data ?? null
  });
}

export function isCanceledError(error) {
  return error?.kind === "canceled" || isCancel(error);
}
