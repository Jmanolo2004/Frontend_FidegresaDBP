import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { ErrorScreen } from "../../components/errors/ErrorScreen";
import { ErrorIllustration } from "../../components/errors/ErrorScreen";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";

export default function NotFoundPage({ embedded = false }) {
  useDocumentTitle("Página no encontrada");
  const navigate = useNavigate();

  if (embedded) {
    return (
      <div className="panel embedded-not-found">
        <span className="error-illustration">
          <ErrorIllustration variant="map" />
        </span>
        <p className="error-code">ERROR 404</p>
        <h1>Esta sección no existe</h1>
        <p>Revisa la dirección o vuelve a las métricas de tu negocio.</p>
        <button type="button" className="primary-button" onClick={() => navigate("/panel/metricas")}>
          Ir a Métricas
        </button>
      </div>
    );
  }

  return (
    <ErrorScreen
      code="ERROR 404"
      title="Página no encontrada"
      description="La dirección que buscas no existe o fue movida. Vuelve al inicio para seguir explorando Fidegresa."
      primaryLabel="Volver al inicio"
      onPrimary={() => navigate("/")}
      secondaryLabel="Ir a mi panel"
      onSecondary={() => navigate("/panel/metricas")}
      illustration="map"
    />
  );
}

NotFoundPage.propTypes = { embedded: PropTypes.bool };
