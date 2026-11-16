import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { ErrorScreen } from "../../components/errors/ErrorScreen";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";
import { useToast } from "../../hooks/useToast";

export default function ConnectionErrorPage() {
  const online = useOnlineStatus();
  const { showError } = useToast();

  useEffect(() => {
    if (online) return undefined;
    const previousTitle = document.title;
    document.title = "Sin conexión | Fidegresa";
    return () => { document.title = previousTitle; };
  }, [online]);

  const retry = () => {
    if (!navigator.onLine) showError("Seguimos sin conexión. Revisa tu red e inténtalo otra vez.");
  };

  if (online) return <Navigate to="/login" replace />;

  return (
    <ErrorScreen
      code="SIN CONEXIÓN"
      title="Sin conexión"
      description="No pudimos conectar con Fidegresa. Comprueba tu conexión e inténtalo nuevamente."
      primaryLabel="Reintentar conexión"
      onPrimary={retry}
    />
  );
}
