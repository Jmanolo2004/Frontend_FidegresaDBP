import { Component } from "react";
import PropTypes from "prop-types";
import { ErrorScreen } from "./ErrorScreen";

/** Captura errores de renderizado para que una falla no deje la pantalla en blanco. */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Error de renderizado en Fidegresa:", error, info.componentStack);
  }

  componentDidUpdate(previousProps) {
    if (this.state.hasError && previousProps.resetKey !== this.props.resetKey) this.setState({ hasError: false });
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.inline) {
      return (
        <div className="panel inline-error-boundary" role="alert">
          <h2>No pudimos mostrar esta sección</h2>
          <p>Ocurrió un error inesperado. Puedes recargar la sección o volver al panel.</p>
          <button type="button" className="primary-button" onClick={() => this.setState({ hasError: false })}>
            Volver a intentar
          </button>
        </div>
      );
    }
    return (
      <ErrorScreen
        code="ERROR"
        title="Algo salió mal"
        description="Ocurrió un error inesperado al mostrar esta pantalla. Recarga la página para continuar."
        primaryLabel="Recargar página"
        onPrimary={() => window.location.reload()}
      />
    );
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  inline: PropTypes.bool,
  resetKey: PropTypes.string
};
