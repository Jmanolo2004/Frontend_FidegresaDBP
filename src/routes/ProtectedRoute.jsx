import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { LoadingScreen } from "../components/common/LoadingScreen";

/** Solo deja pasar a usuarios autenticados; si no, redirige al login recordando la ruta. */
export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "checking") return <LoadingScreen message="Verificando tu sesión..." />;
  if (status !== "authenticated") {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }
  return <Outlet />;
}
