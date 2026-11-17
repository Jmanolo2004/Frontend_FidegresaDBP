import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { LoadingScreen } from "../components/common/LoadingScreen";

/** Login y registro no se muestran si ya hay una sesión activa. */
export function PublicOnlyRoute() {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === "checking") return <LoadingScreen message="Verificando tu sesión..." />;
  if (status === "authenticated") {
    const registrationLimit = location.pathname === "/registro" && user?.locationNotCreated;
    return <Navigate to={registrationLimit ? "/panel/ubicaciones" : location.state?.from || "/panel/metricas"} state={registrationLimit ? { registrationLimit: true } : undefined} replace />;
  }
  return <Outlet />;
}
