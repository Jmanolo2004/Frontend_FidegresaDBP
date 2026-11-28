import { useRef, useState } from "react";
import PropTypes from "prop-types";
import { Icon } from "../common/Icon";
import { QrCode } from "../common/QrCode";
import { Skeleton } from "../common/Skeleton";
import { useFetch } from "../../hooks/useFetch";
import { useToast } from "../../hooks/useToast";
import { menuService } from "../../services/menuService";

const PNG_SIZE = 1200;

/** Convierte el QR (SVG) en una imagen PNG grande, lista para imprimir. */
async function downloadPng(svg, fileName) {
  const source = new XMLSerializer().serializeToString(svg);
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = PNG_SIZE;
  canvas.height = PNG_SIZE;
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  context.drawImage(image, 0, 0, PNG_SIZE, PNG_SIZE);
  const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

/**
 * QR del menú público del local: la clienta lo escanea en la mesa o el mostrador y llega a /m/{slug}.
 * Si el backend no tiene PUBLIC_WEB_URL, el enlace se arma con el dominio donde está abierto el panel.
 */
export function MenuQrCard({ branchId, branchName }) {
  const { showToast, showError } = useToast();
  const qrRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const request = useFetch(({ signal }) => menuService.getPublicLink(branchId, { signal }), [branchId], { enabled: Boolean(branchId) });
  const link = request.data;
  const url = link ? link.url || `${window.location.origin}${link.path || `/m/${link.slug}`}` : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      showToast("Enlace del menú copiado.");
    } catch {
      showError("No pudimos copiar el enlace. Cópialo a mano.");
    }
  };

  const download = async () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;
    setDownloading(true);
    try {
      await downloadPng(svg, `qr-menu-${link.slug}.png`);
    } catch {
      showError("No pudimos descargar el QR. Inténtalo otra vez.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className="panel menu-qr" aria-labelledby="menu-qr-title">
      <div className="menu-qr-code" ref={qrRef}>
        {link ? <QrCode value={url} size={148} label={`QR del menú de ${branchName}`} /> : <Skeleton width={148} height={148} radius={10} />}
      </div>
      <div className="menu-qr-copy">
        <h2 id="menu-qr-title">QR de tu menú</h2>
        <p>Imprímelo y ponlo en las mesas o el mostrador. Al escanearlo, tus clientes ven la carta y se unen al club desde su celular.</p>
        {request.error && !link && (
          <p className="menu-qr-error">
            No pudimos cargar el enlace del menú.{" "}
            <button type="button" className="link-button" onClick={() => request.reload()}>Reintentar</button>
          </p>
        )}
        {link && <code className="menu-qr-url">{url}</code>}
        <div className="menu-qr-actions">
          <button type="button" className="primary-button" onClick={download} disabled={!link || downloading}>
            <Icon name="download" size={16} />
            {downloading ? "Preparando…" : "Descargar QR"}
          </button>
          <button type="button" className="secondary-button" onClick={copy} disabled={!link}>
            <Icon name="link" size={16} />
            Copiar enlace
          </button>
          {link && (
            <a className="secondary-button" href={url} target="_blank" rel="noreferrer">
              <Icon name="eye" size={16} />
              Ver como cliente
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

MenuQrCard.propTypes = { branchId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]), branchName: PropTypes.string };
