import PropTypes from "prop-types";
import { BrandLink } from "../common/BrandLink";
import { AuthShowcase } from "./AuthShowcase";

export function AuthLayout({ variant = "login", children }) {
  const isRegister = variant === "register";
  return (
    <main className={`auth-screen${isRegister ? " register-screen" : ""}`}>
      <section className={`auth-panel${isRegister ? " register-panel" : ""}`}>
        <BrandLink variant="auth" />
        <div className={`auth-form-wrap${isRegister ? " register-form-wrap" : ""}`}>{children}</div>
        <span className="auth-copyright">© {new Date().getFullYear()} Fidegresa</span>
      </section>
      <AuthShowcase variant={variant} />
    </main>
  );
}

AuthLayout.propTypes = { variant: PropTypes.oneOf(["login", "register"]), children: PropTypes.node.isRequired };
