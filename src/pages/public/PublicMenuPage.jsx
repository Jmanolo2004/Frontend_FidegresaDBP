import "@fontsource-variable/bricolage-grotesque/standard.css";
import "@fontsource-variable/instrument-sans/index.css";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useFetch } from "../../hooks/useFetch";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { Icon } from "../../components/common/Icon";
import { Skeleton } from "../../components/common/Skeleton";
import { JoinDialog, PROGRAM_LABELS } from "../../components/publicmenu/JoinDialog";
import { publicFileUrl, publicMenuService } from "../../services/publicMenuService";
import { toApiError } from "../../api/apiErrors";
import { formatMoney } from "../../utils/format";
import "../../styles/public-menu.css";

const REFERRAL_KEY = "fidegresa.referral";
const POPUP_KEY = "fidegresa.menuPopup";

function readSession(key) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSession(key, value) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Sin sessionStorage (modo privado) la página igual funciona.
  }
}

/** Página que ve la clienta al escanear el QR del local: la carta, los beneficios y el pop up para unirse. */
export default function PublicMenuPage() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const [joinOpen, setJoinOpen] = useState(false);
  const { data: rawMenu, error, loading, reload } = useFetch(options => publicMenuService.getMenu(slug, options), [slug]);

  // El código de la amiga llega por /r/:code (?ref=) y se guarda por si la clienta navega antes de unirse.
  const referralCode = useMemo(() => {
    const fromUrl = searchParams.get("ref");
    if (fromUrl) writeSession(REFERRAL_KEY, fromUrl);
    return fromUrl || readSession(REFERRAL_KEY) || null;
  }, [searchParams]);

  const menu = useMemo(() => {
    if (!rawMenu) return null;
    return {
      ...rawMenu,
      invitation: rawMenu.invitation ? { ...rawMenu.invitation, imageUrlResolved: publicFileUrl(rawMenu.invitation.imageUrl) } : null,
      programs: rawMenu.programs || [],
      products: Array.isArray(rawMenu.products) ? rawMenu.products : []
    };
  }, [rawMenu]);

  useDocumentTitle(menu ? `${menu.branch.name} · Menú` : "Menú");

  // El pop up se abre solo una vez por visita, y solo si el local tiene a qué unirse.
  useEffect(() => {
    if (!menu || !menu.programs.length) return undefined;
    const key = `${POPUP_KEY}.${slug}`;
    if (readSession(key)) return undefined;
    const timer = setTimeout(() => {
      writeSession(key, "1");
      setJoinOpen(true);
    }, referralCode ? 400 : 1800);
    return () => clearTimeout(timer);
  }, [menu, slug, referralCode]);

  if (loading) {
    return (
      <main className="pm-page" aria-busy="true">
        <div className="pm-shell">
          <Skeleton height={180} />
          <Skeleton height={120} />
          <Skeleton height={240} />
        </div>
      </main>
    );
  }

  if (error || !menu) {
    const apiError = toApiError(error);
    const notFound = apiError.status === 404;
    return (
      <main className="pm-page">
        <div className="pm-shell pm-empty">
          <h1>{notFound ? "Este menú no está disponible" : "No pudimos abrir el menú"}</h1>
          <p>{notFound ? "Puede que el local haya cambiado su código QR. Pídele uno nuevo al personal." : apiError.message}</p>
          {!notFound && <button type="button" className="pm-primary" onClick={() => reload()}>Reintentar</button>}
          <Link className="pm-footer-link" to="/">Conoce Fidegresa</Link>
        </div>
      </main>
    );
  }

  const brand = menu.business.primaryColor || "#241510";
  const pdfFiles = menu.pdf?.files || [];
  const hasCarta = pdfFiles.length > 0 || Boolean(menu.webUrl);
  const canJoin = menu.programs.length > 0;

  return (
    <main className="pm-page" style={{ "--pm-brand": brand }}>
      <div className="pm-shell">
        <header className="pm-hero">
          <p className="pm-eyebrow">{[menu.branch.category, menu.branch.district].filter(Boolean).join(" · ")}</p>
          <h1>{menu.branch.name}</h1>
          {menu.business.name !== menu.branch.name && <p className="pm-business">{menu.business.name}</p>}
          <ul className="pm-facts">
            {menu.branch.address && <li><Icon name="pin" size={15} /> {menu.branch.address}</li>}
            {menu.branch.schedule && <li><Icon name="visits" size={15} /> {menu.branch.schedule}</li>}
          </ul>
        </header>

        {referralCode && canJoin && (
          <button type="button" className="pm-referral" onClick={() => setJoinOpen(true)}>
            Te invitaron al club. Únete y empieza a ganar beneficios.
          </button>
        )}

        <section className="pm-section" aria-labelledby="pm-carta">
          <h2 id="pm-carta">Nuestra carta</h2>
          {!hasCarta && <p className="pm-muted">Este local todavía no publicó su carta. Pregunta por ella en caja.</p>}
          {menu.pdf?.format === "PDF" && pdfFiles.map(file => (
            <a key={file.id} className="pm-carta-link" href={publicFileUrl(file.url)} target="_blank" rel="noreferrer">
              <Icon name="file" size={20} />
              <span><strong>Ver la carta</strong><small>{file.name}</small></span>
              <Icon name="chevronRight" size={18} />
            </a>
          ))}
          {menu.pdf?.format === "IMAGES" && (
            <div className="pm-carta-images">
              {pdfFiles.map((file, index) => (
                <img key={file.id} src={publicFileUrl(file.url)} alt={`Carta, página ${index + 1}`} loading={index === 0 ? "eager" : "lazy"} />
              ))}
            </div>
          )}
          {menu.webUrl && (
            <a className="pm-carta-link" href={menu.webUrl} target="_blank" rel="noreferrer">
              <Icon name="link" size={20} />
              <span><strong>Ver la carta en línea</strong><small>{menu.webUrl.replace(/^https?:\/\//, "")}</small></span>
              <Icon name="chevronRight" size={18} />
            </a>
          )}
        </section>

        {menu.products.length > 0 && (
          <section className="pm-section" aria-labelledby="pm-productos">
            <h2 id="pm-productos">Productos</h2>
            <ul className="pm-products">
              {menu.products.map(product => (
                <li key={product.id} className={product.inStock === false ? "is-out" : undefined}>
                  {product.imageUrl ? <img src={publicFileUrl(product.imageUrl)} alt="" loading="lazy" /> : <span className="pm-product-placeholder" aria-hidden="true" />}
                  <div>
                    <strong>{product.name}</strong>
                    {product.description && <small>{product.description}</small>}
                  </div>
                  <span className="pm-price">{product.inStock === false ? "Agotado" : formatMoney(product.price)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {canJoin && (
          <section className="pm-section" aria-labelledby="pm-beneficios">
            <h2 id="pm-beneficios">Beneficios del club</h2>
            <ul className="pm-programs">
              {menu.programs.map(program => (
                <li key={program.id} style={{ "--pm-program": program.primaryColor || brand }}>
                  <span className="pm-program-type">{PROGRAM_LABELS[program.type] || program.type}</span>
                  <strong>{program.name}</strong>
                  {program.description && <small>{program.description}</small>}
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="pm-footer">
          <Link className="pm-footer-link" to="/">Club de beneficios con Fidegresa</Link>
        </footer>
      </div>

      {canJoin && (
        <div className="pm-cta">
          <button type="button" className="pm-primary" onClick={() => setJoinOpen(true)}>
            {menu.invitation?.buttonLabel || "Únete al club"}
          </button>
        </div>
      )}

      {canJoin && <JoinDialog open={joinOpen} onClose={() => setJoinOpen(false)} slug={slug} menu={menu} referralCode={referralCode} />}
    </main>
  );
}
