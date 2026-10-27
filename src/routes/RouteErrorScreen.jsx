import { useNavigate, useRouteError } from "react-router-dom";
import { ErrorScreen } from "../components/errors/ErrorScreen";

/** Se muestra si falla la carga de una ruta (por ejemplo, un chunk perezoso sin conexión). */
export function RouteErrorScreen() {
  const error = useRouteError();
  const navigate = useNavigate();
  console.error("Error en la ruta:", error);
  const isChunkError = /Failed to fetch dynamically imported module|Loading chunk/i.test(String(error?.message));

  return (
    <ErrorScreen
      code={isChunkError ? "SIN CONEXIÓN" : "ERROR"}
      title={isChunkError ? "No pudimos cargar esta sección" : "Algo salió mal"}
      description={isChunkError ? "Comprueba tu conexión e inténtalo nuevamente." : "Ocurrió un error inesperado. Vuelve a intentarlo."}
      primaryLabel="Reintentar"
      onPrimary={() => window.location.reload()}
      secondaryLabel="Ir al inicio"
      onSecondary={() => navigate("/")}
    />
  );
}
