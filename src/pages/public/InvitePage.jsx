import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import "@fontsource-variable/bricolage-grotesque/standard.css";
import "@fontsource-variable/instrument-sans/index.css";
import "../../styles/landing.css";
import "../../styles/invite.css";
import { StampMark } from "../../components/landing/StampMark";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useFetch } from "../../hooks/useFetch";
import { cleanReferralCode, referralService } from "../../services/referralService";

const BENEFITS = [
  { title: "Tarjetas en Google Wallet", text: "Estampillas, cashback, niveles o gift cards: tus clientes las guardan en su celular, sin descargar nada." },
  { title: "Sabes quién vuelve", text: "Cada visita queda registrada desde la app de caja: ves a tus clientes más fieles y por qué local pasan." },
  { title: "Premias a los mejores", text: "Promociones, cumpleaños y recompensas para que el cliente frecuente siga eligiéndote." }
];

/**
 * /unete/:code — "Recomienda Fidegresa": un negocio comparte este enlace con otro dueño. Muestra quién lo invita y lleva
 * al registro con el código, para que la invitación cuente en el programa de referidos del negocio que invitó.
 */
export default function InvitePage() {
  const { code: rawCode } = useParams();
  const code = cleanReferralCode(rawCode);
  const invite = useFetch(({ signal }) => referralService.getBusinessInvite(code, { signal }), [code], { enabled: Boolean(code) });
  const valid = Boolean(code) && !invite.error;
  const businessName = invite.data?.businessName;

  useDocumentTitle(businessName ? `${businessName} te invita` : "Te invitaron a Fidegresa");

  useEffect(() => {
    if (valid) referralService.remember(code);
  }, [valid, code]);

  const registerUrl = valid ? `/registro?ref=${encodeURIComponent(code)}` : "/registro";

  return (
    <div className="lp invite-page">
      <header className="lp-header">
        <Link className="lp-brand" to="/" aria-label="Fidegresa, inicio">
          <img src="/favicon.svg" alt="" width="34" height="34" />
          Fidegresa
        </Link>
        <Link className="lp-button is-primary is-small" to={registerUrl}>
          Crear cuenta
        </Link>
      </header>

      <main className="invite-hero">
        <div className="invite-copy">
          <p className="invite-eyebrow">{valid ? "Invitación" : "Enlace de invitación"}</p>
          {invite.loading ? (
            <h1 className="invite-title is-loading" aria-busy="true">
              Cargando tu invitación…
            </h1>
          ) : valid ? (
            <h1 className="invite-title">
              {businessName ? (
                <>
                  <span className="invite-business">{businessName}</span> te invita a Fidegresa.
                </>
              ) : (
                "Te invitaron a Fidegresa."
              )}
            </h1>
          ) : (
            <h1 className="invite-title">Este enlace de invitación no existe.</h1>
          )}
          <p className="invite-lead">
            {valid
              ? "Fideliza a tus clientes con tarjetas digitales, sigue sus visitas y premia a los más fieles. Crea tu cuenta con esta invitación."
              : "Revisa que el enlace esté completo. Igual puedes crear tu cuenta y conocer Fidegresa."}
          </p>
          <div className="invite-actions">
            <Link className="lp-button is-primary" to={registerUrl}>
              Crear mi cuenta
            </Link>
            <Link className="lp-button is-ghost" to="/">
              Conocer Fidegresa
            </Link>
          </div>
          {valid ? (
            <p className="invite-code">
              Código de invitación <strong>{code}</strong>
            </p>
          ) : null}
        </div>

        <ul className="invite-benefits" aria-label="Lo que obtienes con Fidegresa">
          {BENEFITS.map((benefit, index) => (
            <li key={benefit.title} className="invite-benefit">
              <span className="invite-benefit-number" aria-hidden="true">
                {index + 1}
              </span>
              <div>
                <h2>{benefit.title}</h2>
                <p>{benefit.text}</p>
              </div>
            </li>
          ))}
          <StampMark className="invite-stamp" />
        </ul>
      </main>
    </div>
  );
}
