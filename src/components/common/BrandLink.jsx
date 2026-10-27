import PropTypes from "prop-types";
import { Link } from "react-router-dom";

/** Logo + nombre de Fidegresa con sus tres variantes visuales del diseño original. */
export function BrandLink({ variant = "marketing", to = "/" }) {
  if (variant === "sidebar") {
    return (
      <Link className="brand" to={to} aria-label="Fidegresa, información">
        <img className="brand-logo" src="/favicon.svg" alt="" />
        <span className="brand-copy">
          <strong>Fidegresa</strong>
          <small>Fideliza y regresa</small>
        </span>
      </Link>
    );
  }
  return (
    <Link className={variant === "auth" ? "auth-brand" : "marketing-brand"} to={to} aria-label="Fidegresa, inicio">
      <img src="/favicon.svg" alt="" />
      <span>
        Fidegresa<small>Fideliza y regresa</small>
      </span>
    </Link>
  );
}

BrandLink.propTypes = { variant: PropTypes.oneOf(["marketing", "auth", "sidebar"]), to: PropTypes.string };
