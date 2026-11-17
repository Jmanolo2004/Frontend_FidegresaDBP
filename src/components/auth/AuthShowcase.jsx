import PropTypes from "prop-types";
// Fotos de Unsplash (licencia libre). Login: Cova Software, con la pantalla de la tablet reemplazada por una tarjeta de sellos.
// Registro: Blake Wisz, recepción de un salón de belleza.
import loginPhoto from "../../assets/auth-cafe.jpg";
import loginPhotoWebp from "../../assets/auth-cafe.webp";
import registerPhoto from "../../assets/register-salon.jpg";
import registerPhotoWebp from "../../assets/register-salon.webp";
import { PhoneCard } from "../landing/PhoneCard";
import "../../styles/landing.css";

const COPY = {
  login: {
    title: "Tus clientes te están esperando.",
    text: "Revisa quién volvió esta semana y a quién le falta poco para su premio.",
    photo: loginPhoto,
    photoWebp: loginPhotoWebp,
    height: 1281
  },
  register: {
    title: "Tu primera tarjeta, lista hoy.",
    text: "Crea tu programa en minutos y entrégalo en el mostrador con un QR.",
    photo: registerPhoto,
    photoWebp: registerPhotoWebp,
    height: 1280
  }
};

/** Panel derecho de login y registro: la misma escena y la misma tarjeta que la portada. */
export function AuthShowcase({ variant = "login" }) {
  const copy = COPY[variant] || COPY.login;
  return (
    <aside className={`auth-showcase is-${variant}`} aria-label="Así se ve Fidegresa en tu mostrador">
      <picture className="auth-showcase-media" aria-hidden="true">
        <source srcSet={copy.photoWebp} type="image/webp" />
        <img src={copy.photo} alt="" width="1920" height={copy.height} decoding="async" />
      </picture>
      <div className="auth-showcase-copy">
        <h2>{copy.title}</h2>
        <p>{copy.text}</p>
      </div>
      <PhoneCard stamps={variant === "register" ? 1 : 6} className="auth-showcase-phone" />
    </aside>
  );
}

AuthShowcase.propTypes = { variant: PropTypes.oneOf(["login", "register"]) };
