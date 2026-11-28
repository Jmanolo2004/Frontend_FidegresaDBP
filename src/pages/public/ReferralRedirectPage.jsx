import "@fontsource-variable/bricolage-grotesque/standard.css";
import "@fontsource-variable/instrument-sans/index.css";
import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useFetch } from "../../hooks/useFetch";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { Spinner } from "../../components/common/Spinner";
import { publicMenuService } from "../../services/publicMenuService";
import { toApiError } from "../../api/apiErrors";
import "../../styles/public-menu.css";

/**
 * Enlace que comparte una clienta (/r/:code): muestra quién la invitó y lleva al menú del local
 * con su código, para que la nueva clienta quede registrada como referida al unirse.
 */
export default function ReferralRedirectPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { data: referral, error, loading } = useFetch(options => publicMenuService.getReferral(code, options), [code]);
  useDocumentTitle(referral ? `Te invitaron a ${referral.businessName}` : "Invitación");

  const menuPath = referral?.menuSlug ? `/m/${encodeURIComponent(referral.menuSlug)}?ref=${encodeURIComponent(referral.code || code)}` : null;

  useEffect(() => {
    if (!menuPath) return undefined;
    const timer = setTimeout(() => navigate(menuPath, { replace: true }), 2200);
    return () => clearTimeout(timer);
  }, [menuPath, navigate]);

  return (
    <main className="pm-page">
      <div className="pm-shell pm-empty">
        {loading && <><Spinner /><p>Abriendo tu invitación…</p></>}
        {!loading && referral && (
          <>
            <p className="pm-eyebrow">{referral.branchName}</p>
            <h1>{referral.referrerName ? `${referral.referrerName.split(" ")[0]} te invitó a ${referral.businessName}` : `Te invitaron a ${referral.businessName}`}</h1>
            {referral.reward && <p>Con esta invitación ganas {referral.reward} de regalo en tu primera visita.</p>}
            {menuPath ? (
              <Link className="pm-primary" to={menuPath} replace>Ver el menú y unirme</Link>
            ) : (
              <p className="pm-muted">Este local todavía no tiene su menú público. Pide tu tarjeta en caja.</p>
            )}
          </>
        )}
        {!loading && !referral && (
          <>
            <h1>Esta invitación ya no está disponible</h1>
            <p className="pm-muted">{toApiError(error).status === 404 ? "Puede que el enlace esté incompleto o haya vencido." : toApiError(error).message}</p>
            <Link className="pm-footer-link" to="/">Conoce Fidegresa</Link>
          </>
        )}
      </div>
    </main>
  );
}
