import PropTypes from "prop-types";

/** Pantalla de carga original: logo, spinner y mensaje. */
export function LoadingScreen({ message = "Preparando tu espacio..." }) {
  return (
    <section className="loading-screen" aria-live="polite" aria-label="Cargando Fidegresa">
      <img src="/logo.svg" alt="Fidegresa, Fideliza y regresa" />
      <span className="loading-spinner" aria-hidden="true" />
      <p>{message}</p>
    </section>
  );
}

LoadingScreen.propTypes = { message: PropTypes.string };
