import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "@fontsource-variable/bricolage-grotesque/standard.css";
import "@fontsource-variable/instrument-sans/index.css";
import "../../styles/landing.css";
import { CardTypes } from "../../components/landing/CardTypes";
import { AUDIENCES, FAQS } from "../../components/landing/landingContent";
import { PanelDemo } from "../../components/landing/PanelDemo";
import { PhoneCard } from "../../components/landing/PhoneCard";
import { PricingList } from "../../components/landing/PricingList";
import { ScrollStory } from "../../components/landing/ScrollStory";
import { StampMark } from "../../components/landing/StampMark";
import { Icon } from "../../components/common/Icon";
import { useAuth } from "../../hooks/useAuth";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { ROUTES } from "../../routes/router";

const HERO_STAMPS = 6;
const STAMP_INTERVAL_MS = 240;

export default function LandingPage() {
  useDocumentTitle("");
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const reducedMotion = usePrefersReducedMotion();
  const [heroStamps, setHeroStamps] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  useEffect(() => {
    const dialog = menuRef.current;
    if (!dialog) return undefined;
    if (!menuOpen) {
      if (dialog.open) dialog.close();
      return undefined;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    dialog.querySelector("a")?.focus();
    const handleKeyDown = event => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenuOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
    };
  }, [menuOpen]);

  useEffect(() => {
    if (reducedMotion) return undefined;
    const timer = setInterval(() => {
      setHeroStamps(count => {
        if (count + 1 >= HERO_STAMPS) clearInterval(timer);
        return Math.min(HERO_STAMPS, count + 1);
      });
    }, STAMP_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [reducedMotion]);

  const goToRegister = () => navigate(isAuthenticated ? ROUTES.dashboard : ROUTES.register);
  const goToLogin = () => navigate(ROUTES.login);

  return (
    <div className="lp">
      <header className="lp-header">
        <Link className="lp-brand" to={ROUTES.home} aria-label="Fidegresa, inicio">
          <img src="/favicon.svg" alt="" width="34" height="34" />
          Fidegresa
        </Link>
        <nav className="lp-nav" aria-label="Navegación del sitio">
          <a href="#como-funciona">Cómo funciona</a>
          <a href="#tarjetas">Tarjetas</a>
          <a href="#panel">Panel</a>
          <a href="#planes">Planes</a>
        </nav>
        <div className="lp-header-actions">
          <button type="button" className="lp-text-button" onClick={goToLogin}>
            Iniciar sesión
          </button>
          <button type="button" className="lp-button is-primary is-small" onClick={goToRegister}>
            Crear cuenta
          </button>
          <button type="button" className="lp-menu-toggle" aria-label="Abrir menú" aria-expanded={menuOpen} aria-controls="landing-menu" onClick={() => setMenuOpen(true)}>
            <Icon name="menu" size={24} />
          </button>
        </div>
      </header>
      <dialog id="landing-menu" className="lp-mobile-menu" ref={menuRef} aria-label="Navegación del sitio" onCancel={event => { event.preventDefault(); setMenuOpen(false); }}>
        <button type="button" className="lp-menu-close" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)}><Icon name="close" size={24} /></button>
        <nav aria-label="Navegación móvil">
          <a href="#como-funciona" onClick={() => setMenuOpen(false)}>Cómo funciona</a>
          <a href="#tarjetas" onClick={() => setMenuOpen(false)}>Tarjetas</a>
          <a href="#panel" onClick={() => setMenuOpen(false)}>Panel</a>
          <a href="#planes" onClick={() => setMenuOpen(false)}>Planes</a>
          <button type="button" onClick={() => { setMenuOpen(false); goToLogin(); }}>Iniciar sesión</button>
          <button type="button" className="lp-button is-primary" onClick={() => { setMenuOpen(false); goToRegister(); }}>Crear cuenta</button>
        </nav>
      </dialog>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <h1>Que te elijan otra vez.</h1>
            <p>Cambia la tarjeta de cartón por una tarjeta digital con sellos, cashback o niveles. Tú ves quién vuelve y tu cliente nunca la pierde.</p>
            <div className="hero-actions">
              <button type="button" className="lp-button is-primary" onClick={goToRegister}>
                Crear mi programa gratis
              </button>
              <a className="lp-button is-ghost" href="#como-funciona">
                Ver cómo funciona
              </a>
            </div>
          </div>
          <div className="hero-visual">
            <PhoneCard stamps={reducedMotion ? HERO_STAMPS : heroStamps} className="hero-phone" />
          </div>
        </section>

        <div className="ticker" role="img" aria-label={`Para ${AUDIENCES.join(", ").toLowerCase()}`}>
          <div className="ticker-track" aria-hidden="true">
            {[0, 1].map(group => (
              <div className="ticker-group" key={group}>
                {AUDIENCES.map(audience => (
                  <span key={audience}>
                    {audience}
                    <StampMark />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        <ScrollStory />
        <CardTypes />
        <PanelDemo />
        <PricingList onSelect={goToRegister} />

        <section className="faq" id="preguntas">
          <div className="lp-wrap faq-grid">
            <h2>Antes de empezar</h2>
            <div className="faq-items">
              {FAQS.map(([question, answer]) => (
                <details key={question}>
                  <summary>{question}</summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="closing">
          <StampMark className="closing-stamp" />
          <h2>Empieza con la primera visita.</h2>
          <button type="button" className="lp-button is-dark" onClick={goToRegister}>
            Crear mi programa gratis
          </button>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-wrap lp-footer-grid">
          <div>
            <Link className="lp-brand" to={ROUTES.home} aria-label="Fidegresa, inicio">
              <img src="/favicon.svg" alt="" width="34" height="34" />
              Fidegresa
            </Link>
            <p>Pequeños momentos, grandes lealtades.</p>
          </div>
          <nav aria-label="Enlaces del sitio">
            <a href="#como-funciona">Cómo funciona</a>
            <a href="#planes">Planes</a>
            <a href="#preguntas">Preguntas frecuentes</a>
          </nav>
          <nav aria-label="Información legal">
            <a href="mailto:contacto@fidegresa.com">contacto@fidegresa.com</a>
            <Link to={ROUTES.terms}>Términos y condiciones</Link>
            <Link to={ROUTES.privacy}>Política de privacidad</Link>
          </nav>
          <p className="lp-legal">
            De conformidad con la Ley N° 29571, Código de Protección y Defensa del Consumidor, este establecimiento pone a tu disposición el Libro de Reclamaciones para registrar cualquier consulta, queja o reclamo relacionado con sus productos y servicios.
          </p>
        </div>
        <p className="lp-copyright">© {new Date().getFullYear()} Fidegresa</p>
      </footer>
    </div>
  );
}
