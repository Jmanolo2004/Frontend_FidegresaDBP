import { Link, useNavigate } from "react-router-dom";
import { BrandLink } from "../../components/common/BrandLink";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useAuth } from "../../hooks/useAuth";
import { ROUTES } from "../../routes/router";

const FEATURES = [
  { number: "01", title: "Crea tu programa", text: "Personaliza tarjetas de visitas o cashback con recompensas pensadas para tu negocio." },
  { number: "02", title: "Premia cada regreso", text: "Reconoce la preferencia de tus clientes y dales una buena razón para elegirte de nuevo." },
  { number: "03", title: "Entiende lo que pasa", text: "Observa visitas, ventas, opiniones y actividad por local desde un panel sencillo." }
];

const PLANS = [
  { name: "Esencial", title: "Para dar el primer paso", price: 0, features: ["1 local", "Tarjeta de estampillas", "Panel básico de actividad", "Hasta 50 clientes"], cta: "Comenzar gratis" },
  { name: "Emprende", title: "Para fidelizar cada día", price: 39, features: ["Hasta 2 locales", "Estampillas y cashback", "Panel de métricas", "Hasta 500 clientes"], cta: "Elegir Emprende" },
  { name: "Crece", title: "Para conocer a tus clientes", price: 119, features: ["Hasta 5 locales", "Todos los tipos de tarjeta", "Métricas y tendencias", "Reseñas y geolocalización"], cta: "Elegir Crece", featured: true },
  { name: "Avanza", title: "Para equipos en expansión", price: 229, features: ["Hasta 15 locales", "Panel completo de análisis", "Gestión avanzada de clientes", "Acompañamiento prioritario"], cta: "Elegir Avanza" }
];

const FAQS = [
  ["¿Qué es Fidegresa?", "Es un programa de fidelización digital: reemplaza las tarjetas físicas de sellos de restaurantes y cafeterías por tarjetas digitales, y da al negocio un panel para crear recompensas, revisar su actividad y cuidar la relación con sus clientes."],
  ["¿Qué tipos de tarjetas puedo ofrecer?", "Puedes crear tarjetas de estampillas, cashback, niveles de recompensa y gift cards con saldo de regalo, según las funciones disponibles para tu negocio."],
  ["¿Necesito conocimientos técnicos?", "No. Fidegresa está pensado para que configures el programa de tu negocio desde un panel sencillo y fácil de entender."],
  ["¿Cómo me ayuda a entender el comportamiento de mis clientes?", "El panel presenta tendencias de visitas y ventas, actividad de clientes, reseñas y datos por ubicación para que puedas observar patrones y mejorar tu servicio."],
  ["¿Puedo cambiar de plan?", "Sí. Puedes empezar con el plan gratuito y cambiar de plan cuando tu negocio lo necesite. Los precios mostrados son referenciales."],
  ["¿Qué pasa con las tarjetas físicas que ya entregué?", "Puedes registrar a tus clientes actuales y continuar su progreso en la tarjeta digital, así nadie pierde las visitas que ya acumuló."]
];

export default function LandingPage() {
  useDocumentTitle("");
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const goToRegister = () => navigate(isAuthenticated ? ROUTES.dashboard : ROUTES.register);
  const goToLogin = () => navigate(isAuthenticated ? ROUTES.dashboard : ROUTES.login);

  return (
    <main className="marketing-screen">
      <header className="marketing-header">
        <BrandLink />
        <nav className="marketing-nav" aria-label="Navegación del sitio">
          <a href="#como-funciona">Cómo funciona</a>
          <a href="#planes">Planes</a>
          <a href="#preguntas">Preguntas</a>
        </nav>
        <div className="marketing-header-actions">
          <button type="button" className="link-button marketing-login" onClick={goToLogin}>
            {isAuthenticated ? "Ir a mi panel" : "Iniciar sesión"}
          </button>
          <button type="button" className="marketing-start" onClick={goToRegister}>
            Comenzar gratis
          </button>
        </div>
      </header>

      <section className="marketing-hero" id="inicio">
        <div className="marketing-hero-copy">
          <span className="marketing-kicker">Un programa de lealtad hecho para crecer contigo</span>
          <h1>
            Haz que cada visita tenga una razón para <em>volver.</em>
          </h1>
          <p>Fidegresa ayuda a los negocios locales a reconocer a sus clientes, premiar su preferencia y convertir buenas experiencias en relaciones duraderas.</p>
          <div className="marketing-hero-actions">
            <button type="button" className="marketing-start" onClick={goToRegister}>
              Comienza gratis
            </button>
            <a className="marketing-secondary" href="#como-funciona">
              Conoce Fidegresa <span aria-hidden="true">↓</span>
            </a>
          </div>
          <span className="marketing-note">Sin costo para empezar · Diseñado para negocios locales</span>
        </div>
        <div className="marketing-hero-visual" aria-label="Ejemplo de tarjeta de fidelización">
          <div className="marketing-orbit marketing-orbit-one" />
          <div className="marketing-orbit marketing-orbit-two" />
          <article className="marketing-loyalty-card">
            <span className="loyalty-card-brand">
              <img src="/favicon.svg" alt="" /> Café de la Plaza
            </span>
            <span className="loyalty-card-caption">UN DETALLE EN CADA VISITA</span>
            <strong>
              Tu próximo café
              <br />
              va por nuestra cuenta.
            </strong>
            <div className="loyalty-stamps" aria-label="Seis de diez visitas">
              {Array.from({ length: 10 }, (_, index) => (
                <i key={index}>{index < 6 ? "✓" : ""}</i>
              ))}
            </div>
            <span className="loyalty-card-foot">6 de 10 visitas · ¡Ya casi!</span>
          </article>
          <div className="marketing-float-note">
            <span>↗</span>
            <strong>
              Más visitas,
              <br />
              más motivos para volver
            </strong>
          </div>
        </div>
      </section>

      <section className="marketing-section marketing-how" id="como-funciona">
        <div className="marketing-section-heading">
          <span className="marketing-kicker">Fidelizar, sin complicaciones</span>
          <h2>Un mejor vínculo empieza con un pequeño detalle.</h2>
          <p>Fidegresa reúne en un solo lugar las herramientas para crear beneficios, conocer a tus clientes y tomar decisiones con más claridad.</p>
        </div>
        <div className="marketing-feature-grid">
          {FEATURES.map(feature => (
            <article className="marketing-feature" key={feature.number}>
              <span className="marketing-feature-icon">{feature.number}</span>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="marketing-section marketing-card-types">
        <div className="marketing-section-heading">
          <span className="marketing-kicker">Tarjetas para tu forma de atender</span>
          <h2>Elige cómo quieres dar las gracias.</h2>
          <p>Crea una experiencia de fidelización que se sienta natural para ti y valiosa para tus clientes.</p>
        </div>
        <div className="marketing-card-grid">
          <article className="marketing-type-card stamp-type">
            <span className="type-label">Visitas que suman</span>
            <h3>Tarjeta de estampillas</h3>
            <p>Registra cada visita y entrega una recompensa al completar la tarjeta. Simple, familiar y motivadora.</p>
            <div className="type-stamps" aria-hidden="true">
              {Array.from({ length: 6 }, (_, index) => (
                <i key={index}>{index < 3 ? "✓" : ""}</i>
              ))}
            </div>
          </article>
          <article className="marketing-type-card cashback-type">
            <span className="type-label">Una parte de vuelta</span>
            <h3>Tarjeta cashback</h3>
            <p>Devuelve un porcentaje de cada compra como beneficio para una próxima visita.</p>
            <div className="type-cashback">
              <strong>5%</strong>
              <span>de vuelta en tus compras</span>
            </div>
          </article>
        </div>
      </section>

      <section className="marketing-insights">
        <div>
          <span className="marketing-kicker">Tu negocio, con más contexto</span>
          <h2>Conoce mejor a quienes vuelven.</h2>
          <p>El panel organiza la actividad de tu programa para ayudarte a ver tendencias y cuidar cada relación con tus clientes.</p>
          <ul>
            <li>Compara visitas y ventas a lo largo de los meses.</li>
            <li>Revisa la actividad, recurrencia y ubicación de tus clientes.</li>
            <li>Lee las reseñas y detecta qué experiencias puedes mejorar.</li>
            <li>Consulta el rendimiento de tus locales desde un mismo espacio.</li>
          </ul>
        </div>
        <div className="insight-preview" aria-label="Resumen ilustrativo del panel">
          <div className="insight-preview-top">
            <span>Resumen de actividad</span>
            <span>Este mes⌄</span>
          </div>
          <div className="insight-number">
            <strong>+18%</strong>
            <span>visitas recurrentes</span>
          </div>
          <svg viewBox="0 0 420 130" role="img" aria-label="Tendencia ilustrativa de visitas en aumento">
            <path d="M0 112 C35 105 46 89 78 94 S129 69 160 78 S211 51 243 65 S290 37 321 47 S367 19 420 13" fill="none" stroke="#c8894f" strokeWidth="4" strokeLinecap="round" />
            <path d="M0 112 C35 105 46 89 78 94 S129 69 160 78 S211 51 243 65 S290 37 321 47 S367 19 420 13 L420 130 L0 130Z" fill="url(#insight-fill)" opacity=".32" />
            <defs>
              <linearGradient id="insight-fill" x1="210" y1="0" x2="210" y2="130">
                <stop stopColor="#c8894f" />
                <stop offset="1" stopColor="#c8894f" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
          <div className="insight-preview-labels">
            {["ENE", "MAR", "MAY", "JUL", "SEP", "DIC"].map(month => (
              <span key={month}>{month}</span>
            ))}
          </div>
          <div className="insight-preview-bottom">
            <span>Clientes que regresan</span>
            <strong>+12 este mes</strong>
          </div>
        </div>
      </section>

      <section className="marketing-section marketing-pricing" id="planes">
        <div className="marketing-section-heading">
          <span className="marketing-kicker">Planes simples y transparentes</span>
          <h2>Empieza a tu ritmo. Crece a tu manera.</h2>
          <p>Elige el plan que acompaña el momento de tu negocio. Puedes comenzar gratis.</p>
        </div>
        <div className="pricing-grid">
          {PLANS.map(plan => (
            <article className={`pricing-card${plan.featured ? " pricing-featured" : ""}`} key={plan.name}>
              {plan.featured && <span className="pricing-popular">Más elegido</span>}
              <span className="pricing-name">{plan.name}</span>
              <h3>{plan.title}</h3>
              <p className="pricing-amount">
                <strong>S/ {plan.price}</strong>
                <span>soles / mes</span>
              </p>
              <ul>
                {plan.features.map(feature => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <button type="button" className="pricing-button" onClick={goToRegister}>
                {plan.cta}
              </button>
            </article>
          ))}
        </div>
        <p className="pricing-disclaimer">Precios referenciales en soles (incluyen IGV). Puedes empezar gratis y cambiar de plan cuando lo necesites.</p>
      </section>

      <section className="marketing-section marketing-faq" id="preguntas">
        <div className="marketing-section-heading">
          <span className="marketing-kicker">¿Tienes dudas?</span>
          <h2>Preguntas frecuentes</h2>
        </div>
        <div className="faq-list">
          {FAQS.map(([question, answer]) => (
            <details key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="marketing-cta">
        <span className="marketing-kicker">Cada regreso cuenta</span>
        <h2>Comienza a fidelizar a tus clientes</h2>
        <p>Da el primer paso para crear una experiencia que invite a volver.</p>
        <button type="button" className="marketing-start" onClick={goToRegister}>
          Crear mi cuenta gratis
        </button>
      </section>

      <footer className="marketing-footer">
        <div className="marketing-footer-main">
          <div className="marketing-footer-brand">
            <BrandLink />
            <p>Pequeños momentos, grandes lealtades.</p>
          </div>
          <div className="marketing-footer-column">
            <h3>Información</h3>
            <a href="mailto:contacto@fidegresa.com">contacto@fidegresa.com</a>
            <Link to={ROUTES.terms}>Términos y condiciones</Link>
            <Link to={ROUTES.privacy}>Política de privacidad</Link>
          </div>
          <div className="marketing-footer-column">
            <h3>Producto</h3>
            <a href="#como-funciona">Cómo funciona</a>
            <a href="#planes">Planes</a>
            <a href="#preguntas">Preguntas frecuentes</a>
          </div>
          <div className="marketing-footer-column marketing-footer-user">
            <h3>Usuario</h3>
            <button type="button" onClick={goToLogin}>
              Iniciar sesión
            </button>
            <button type="button" onClick={goToRegister}>
              Crear cuenta
            </button>
            <p className="complaint-notice">
              De conformidad con la Ley N° 29571, Código de Protección y Defensa del Consumidor, este establecimiento pone a tu disposición el Libro de Reclamaciones para registrar cualquier consulta, queja o reclamo relacionado con nuestros productos y servicios.
            </p>
          </div>
        </div>
        <div className="marketing-footer-bottom">
          <span>© {new Date().getFullYear()} Fidegresa</span>
          <span>Los precios se muestran en soles y con fines informativos.</span>
        </div>
      </footer>
    </main>
  );
}
