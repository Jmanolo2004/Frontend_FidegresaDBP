import { useState } from "react";
import PropTypes from "prop-types";
import qrcode from "qrcode-generator";
import { Icon } from "../common/Icon";
import { QrCode } from "../common/QrCode";
import { Skeleton } from "../common/Skeleton";
import { useFetch } from "../../hooks/useFetch";
import { useToast } from "../../hooks/useToast";
import { loyaltyProgramService } from "../../services/loyaltyProgramService";

const INK = "#241510";

/** Enlace absoluto del formulario: el backend lo arma con PUBLIC_WEB_URL; si falta, se usa este mismo sitio. */
export function joinUrl(link) {
  if (!link) return "";
  return link.url || `${window.location.origin}${link.path}`;
}

/** Nombre de archivo seguro: "qr-cafe-de-la-plaza.png". */
export function qrFileName(name) {
  const slug = String(name || "tarjeta").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return `qr-${slug || "tarjeta"}.png`;
}

/** Dibuja el QR en un PNG de 1200 px con el nombre de la tarjeta debajo, listo para imprimir. */
function downloadPng(url, card) {
  const qr = qrcode(0, "M");
  qr.addData(url);
  qr.make();
  const modules = qr.getModuleCount();
  const width = 1200;
  const padding = 110;
  const cell = Math.floor((width - padding * 2) / modules);
  const qrSize = cell * modules;
  const offset = Math.round((width - qrSize) / 2);
  const height = offset + qrSize + 230;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.fillStyle = INK;
  for (let row = 0; row < modules; row += 1) {
    for (let col = 0; col < modules; col += 1) {
      if (qr.isDark(row, col)) context.fillRect(offset + col * cell, offset + row * cell, cell, cell);
    }
  }
  context.textAlign = "center";
  context.font = "700 56px system-ui, sans-serif";
  context.fillText(String(card.nombre || "Tu tarjeta").slice(0, 34), width / 2, offset + qrSize + 105);
  context.fillStyle = "#6e6156";
  context.font = "500 38px system-ui, sans-serif";
  context.fillText("Escanea y crea tu tarjeta digital", width / 2, offset + qrSize + 170);
  const anchor = document.createElement("a");
  anchor.href = canvas.toDataURL("image/png");
  anchor.download = qrFileName(card.nombre);
  anchor.click();
}

/** QR del formulario de registro de esta tarjeta: el cliente lo escanea, deja sus datos y recibe su tarjeta. */
export function JoinQrPanel({ card }) {
  const { showToast, showError } = useToast();
  const [copied, setCopied] = useState(false);
  const link = useFetch(({ signal }) => loyaltyProgramService.getJoinLink(card.id, { signal }), [card.id]);
  const url = joinUrl(link.data);
  const active = card.estado === "Activa";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      showToast("Enlace del formulario copiado.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showError("No pudimos copiar el enlace. Cópialo desde la barra del navegador al abrir el formulario.");
    }
  };

  return (
    <aside className="join-qr-panel" aria-labelledby="join-qr-title">
      <h2 id="join-qr-title">Formulario de registro</h2>
      <p>Tus clientes escanean este QR, dejan sus datos y reciben su tarjeta.</p>
      <div className="join-qr-code">
        {link.error ? (
          <span className="join-qr-error"><Icon name="alert" size={18} />No pudimos cargar el QR.</span>
        ) : url ? (
          <QrCode value={url} size={168} label={`QR del formulario de ${card.nombre}`} />
        ) : <Skeleton height={168} radius={10} />}
      </div>
      {!active && <p className="join-qr-note"><Icon name="alert" size={15} />Activa la tarjeta para que el formulario acepte registros.</p>}
      <div className="join-qr-actions">
        <button type="button" className="primary-button" disabled={!url} onClick={() => downloadPng(url, card)}>
          <Icon name="download" size={16} />Descargar QR
        </button>
        <button type="button" className="secondary-button" disabled={!url} onClick={copy}>
          <Icon name="link" size={16} />{copied ? "Copiado" : "Copiar enlace"}
        </button>
      </div>
      {url && <a className="join-qr-open" href={url} target="_blank" rel="noreferrer">Abrir formulario<Icon name="arrow" size={14} /></a>}
      {link.error && <button type="button" className="text-button" onClick={link.reload}>Reintentar</button>}
    </aside>
  );
}

JoinQrPanel.propTypes = { card: PropTypes.object.isRequired };
