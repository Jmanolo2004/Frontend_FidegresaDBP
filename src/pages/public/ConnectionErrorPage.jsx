import { useNavigate } from "react-router-dom";
import { ErrorScreen } from "../../components/errors/ErrorScreen";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useToast } from "../../hooks/useToast";

export default function ConnectionErrorPage() {
  useDocumentTitle("Sin conexión");
  const navigate = useNavigate();
  const { showError } = useToast();

  const retry = () => {
    if (navigator.onLine) navigate("/login", { replace: true });
    else showError("Seguimos sin conexión. Revisa tu red e inténtalo otra vez.");
  };

  return (
    <ErrorScreen
      code="SIN CONEXIÓN"
      title="Sin conexión"
      description="No pudimos conectar con Fidegresa. Comprueba tu conexión e inténtalo nuevamente."
      primaryLabel="Reintentar conexión"
      onPrimary={retry}
      secondaryLabel="Volver al inicio de sesión"
      onSecondary={() => navigate("/login")}
    />
  );
}
