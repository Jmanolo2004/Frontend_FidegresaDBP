import PropTypes from "prop-types";
import { BrandLink } from "../common/BrandLink";

export function ErrorIllustration({ variant = "cup" }) {
  if (variant === "map") {
    return (
      <svg viewBox="0 0 120 120" fill="none" aria-hidden="true">
        <circle cx="60" cy="60" r="52" fill="#f1e6da" />
        <path d="M30 40l20-8 20 8 20-8v48l-20 8-20-8-20 8V40Z" stroke="#603f2a" strokeWidth="4" strokeLinejoin="round" />
        <path d="M50 32v48M70 40v48" stroke="#c8894f" strokeWidth="4" />
        <path d="m52 52 16 16m0-16L52 68" stroke="#603f2a" strokeWidth="4" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <circle cx="60" cy="60" r="52" fill="#f1e6da" />
      <path d="M33 45h54v37a10 10 0 0 1-10 10H43a10 10 0 0 1-10-10V45Z" stroke="#603f2a" strokeWidth="4" />
      <path d="M87 51h4a12 12 0 0 1 0 24h-4M43 34l8 8m0-8-8 8m23-8 8 8m0-8-8 8" stroke="#c8894f" strokeWidth="4" strokeLinecap="round" />
      <path d="m53 63 14 14m0-14L53 77" stroke="#603f2a" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

ErrorIllustration.propTypes = { variant: PropTypes.oneOf(["cup", "map"]) };

/** Pantalla de error a pantalla completa con el diseño original de "Sin conexión". */
export function ErrorScreen({ code, title, description, primaryLabel, onPrimary, secondaryLabel, onSecondary, illustration = "cup" }) {
  return (
    <main className="connection-screen">
      <BrandLink variant="auth" />
      <div className="connection-content">
        <span className="error-illustration">
          <ErrorIllustration variant={illustration} />
        </span>
        <p className="error-code">{code}</p>
        <h1>{title}</h1>
        <p className="connection-description">{description}</p>
        {primaryLabel && (
          <button className="auth-primary retry-button" type="button" onClick={onPrimary}>
            {primaryLabel}
          </button>
        )}
        {secondaryLabel && (
          <button className="link-button back-login" type="button" onClick={onSecondary}>
            {secondaryLabel}
          </button>
        )}
      </div>
      <span className="auth-copyright">© {new Date().getFullYear()} Fidegresa</span>
    </main>
  );
}

ErrorScreen.propTypes = {
  code: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  primaryLabel: PropTypes.string,
  onPrimary: PropTypes.func,
  secondaryLabel: PropTypes.string,
  onSecondary: PropTypes.func,
  illustration: PropTypes.oneOf(["cup", "map"])
};
