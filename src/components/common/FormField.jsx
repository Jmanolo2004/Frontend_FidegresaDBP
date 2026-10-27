import { cloneElement, isValidElement, useId } from "react";
import PropTypes from "prop-types";

/**
 * Envuelve un control (input, select o textarea) con su etiqueta, ayuda y mensaje de error.
 * variant="auth" usa el estilo de las pantallas de acceso; "panel" el de los formularios del panel.
 */
export function FormField({ label, error, hint, optional = false, full = false, variant = "panel", children }) {
  const generatedId = useId();
  const id = children.props.id || generatedId;
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? "true" : undefined,
        className: [children.props.className, error ? "is-invalid" : ""].filter(Boolean).join(" ") || undefined
      })
    : children;

  const content = (
    <>
      <label htmlFor={id}>
        {label} {optional && <span className="optional-label">(opcional)</span>}
      </label>
      {control}
      {hint && !error && (
        <small className="field-hint" id={`${id}-hint`}>
          {hint}
        </small>
      )}
      {error && (
        <small className="field-error" id={`${id}-error`} role="alert">
          {error}
        </small>
      )}
    </>
  );

  if (variant === "auth") return <div className="auth-field">{content}</div>;
  return <div className={`form-field${full ? " full" : ""}`}>{content}</div>;
}

FormField.propTypes = {
  label: PropTypes.string.isRequired,
  error: PropTypes.string,
  hint: PropTypes.string,
  optional: PropTypes.bool,
  full: PropTypes.bool,
  variant: PropTypes.oneOf(["auth", "panel"]),
  children: PropTypes.element.isRequired
};
