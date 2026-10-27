import { forwardRef, useState } from "react";
import PropTypes from "prop-types";
import { Icon } from "../common/Icon";

export const PasswordInput = forwardRef(function PasswordInput({ className = "", ...props }, ref) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="password-wrap">
      <input ref={ref} {...props} className={className} type={visible ? "text" : "password"} />
      <button type="button" className="password-toggle" onClick={() => setVisible(value => !value)} aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={visible}>
        <Icon name={visible ? "eyeOff" : "eye"} size={17} />
      </button>
    </div>
  );
});

PasswordInput.propTypes = { className: PropTypes.string };
