import { useRef, useState } from "react";
import PropTypes from "prop-types";
import { Icon } from "../common/Icon";
import { StatusPill } from "../common/StatusPill";
import { useAuthFile } from "../../hooks/useAuthFile";
import { formatMoney } from "../../utils/format";

/** Botón "+" o lápiz en la esquina de cada tarjeta. */
function CornerButton({ icon, label, onClick, disabled }) {
  return (
    <button type="button" className="menu-corner-button" onClick={onClick} aria-label={label} title={label} disabled={disabled}>
      <Icon name={icon} size={16} />
    </button>
  );
}

CornerButton.propTypes = { icon: PropTypes.string.isRequired, label: PropTypes.string.isRequired, onClick: PropTypes.func.isRequired, disabled: PropTypes.bool };

/** Catálogo PDF: un PDF o un carrusel de imágenes. */
export function PdfCatalogCard({ catalog, uploading, onUpload, onDeleteFile }) {
  const inputRef = useRef(null);
  const [index, setIndex] = useState(0);
  const files = catalog?.files || [];
  const current = files[Math.min(index, files.length - 1)];
  const fileUrl = useAuthFile(current?.previewUrl);
  const isPdf = current?.contentType === "application/pdf";

  const pick = event => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) onUpload(file);
  };

  return (
    <article className="panel menu-card">
      <div className="menu-card-head">
        <div>
          <h2>Catálogo PDF</h2>
          <p>Gestiona tus catálogos en formato PDF aquí.</p>
        </div>
        <CornerButton icon="plus" label="Subir PDF o imagen" onClick={() => inputRef.current?.click()} disabled={uploading} />
        <input ref={inputRef} type="file" hidden accept="application/pdf,image/jpeg,image/png,image/webp" onChange={pick} />
      </div>
      <div className="menu-preview pdf-preview">
        {!current ? (
          <button type="button" className="menu-empty-button" onClick={() => inputRef.current?.click()} disabled={uploading}>
            <Icon name="image" size={34} />
            <span>{uploading ? "Subiendo…" : "Sube tu carta en PDF o imágenes"}</span>
          </button>
        ) : (
          <>
            <span className="menu-file-name" title={current.name}>{current.name}</span>
            {fileUrl ? (
              isPdf ? (
                <iframe className="pdf-frame" src={`${fileUrl}#toolbar=0&navpanes=0&view=FitH`} title={`Vista previa de ${current.name}`} />
              ) : (
                <img className="pdf-image" src={fileUrl} alt={current.name} />
              )
            ) : (
              <div className="menu-loading">Cargando vista previa…</div>
            )}
            <div className="pdf-controls">
              <button type="button" className="menu-round-button" aria-label="Anterior" disabled={files.length < 2} onClick={() => setIndex(value => (value - 1 + files.length) % files.length)}>
                <Icon name="chevronLeft" size={16} />
              </button>
              {fileUrl && (
                <a className="text-button" href={fileUrl} target="_blank" rel="noreferrer">
                  Abrir
                </a>
              )}
              <button type="button" className="text-button danger-text" onClick={() => onDeleteFile(current)}>
                Quitar
              </button>
              <button type="button" className="menu-round-button" aria-label="Siguiente" disabled={files.length < 2} onClick={() => setIndex(value => (value + 1) % files.length)}>
                <Icon name="chevronRight" size={16} />
              </button>
            </div>
          </>
        )}
      </div>
    </article>
  );
}

PdfCatalogCard.propTypes = { catalog: PropTypes.object, uploading: PropTypes.bool, onUpload: PropTypes.func.isRequired, onDeleteFile: PropTypes.func.isRequired };

/** Catálogo web: un enlace externo (por ejemplo, tu carta en otra página). */
export function WebCatalogCard({ catalog, onEdit }) {
  const url = catalog?.url;
  return (
    <article className="panel menu-card">
      <div className="menu-card-head">
        <div>
          <h2>Catálogo Web</h2>
          <p>Enlaza tu carta web o una página externa con tus productos.</p>
        </div>
        <CornerButton icon={url ? "edit" : "plus"} label={url ? "Editar enlace" : "Agregar enlace"} onClick={onEdit} />
      </div>
      <div className="menu-preview web-preview">
        <div className="web-dots" aria-hidden="true"><span /><span /><span /></div>
        {url ? (
          <>
            <Icon name="link" size={26} />
            <a className="web-url" href={url} target="_blank" rel="noreferrer">{url.replace(/^https?:\/\//, "")}</a>
            <StatusPill variant={catalog.active ? "active" : "inactive"}>{catalog.active ? "Visible en tu menú" : "Oculto"}</StatusPill>
          </>
        ) : (
          <>
            <button type="button" className="primary-button" onClick={onEdit}>Crear catálogo web o link externo</button>
            <small>Todavía no tienes un catálogo web.</small>
          </>
        )}
        <div className="web-blocks" aria-hidden="true"><span /><span /><span /><span /></div>
      </div>
    </article>
  );
}

WebCatalogCard.propTypes = { catalog: PropTypes.object, onEdit: PropTypes.func.isRequired };

/** Invitación a Club: vista previa del pop-up. */
export function InvitationCard({ invitation, onEdit }) {
  const statusText = { LIVE: "Activa", PAUSED: "En pausa", EXPIRED: "Vencida", INCOMPLETE: "Falta elegir tarjeta" };
  return (
    <article className="panel menu-card">
      <div className="menu-card-head">
        <div>
          <h2>Invitación a Club</h2>
          <p>Gestiona tus pop-ups, invita a los clientes a tu programa de fidelización.</p>
        </div>
        <CornerButton icon="edit" label="Editar invitación" onClick={onEdit} disabled={!invitation} />
      </div>
      <div className="menu-preview invitation-preview">
        {invitation ? (
          <>
            <strong>{invitation.title}</strong>
            <p>{invitation.text}</p>
            <span className="invitation-button">{invitation.buttonLabel}</span>
            {invitation.configured && <small className="invitation-status">{statusText[invitation.status] || invitation.status}</small>}
          </>
        ) : (
          <div className="menu-loading">Cargando…</div>
        )}
      </div>
    </article>
  );
}

InvitationCard.propTypes = { invitation: PropTypes.object, onEdit: PropTypes.func.isRequired };

/** Tarjeta de un producto oficial: foto, nombre, stock, descripción y precio. */
export function ProductCard({ product, busy, onToggleStock, onEdit, onDelete }) {
  const photo = useAuthFile(product.imageUrl);
  return (
    <article className={`product-card${product.inStock ? "" : " is-out"}`}>
      <div className="product-photo">
        {photo ? <img src={photo} alt={product.name} /> : <Icon name="image" size={34} />}
      </div>
      <div className="product-body">
        <div className="product-title">
          <h3>{product.name}</h3>
          <StatusPill variant={product.inStock ? "active" : "inactive"}>{product.inStock ? "En stock" : "Agotado"}</StatusPill>
        </div>
        {product.description && <p>{product.description}</p>}
        <div className="product-price">
          <small>Precio</small>
          <strong>{formatMoney(product.price)}</strong>
        </div>
        <button type="button" className={product.inStock ? "secondary-button" : "primary-button"} onClick={() => onToggleStock(product)} disabled={busy}>
          {product.inStock ? "Marcar como agotado" : "Reactivar disponibilidad"}
        </button>
        <div className="product-actions">
          <button type="button" className="text-button" onClick={() => onEdit(product)}>Editar</button>
          <button type="button" className="text-button danger-text" onClick={() => onDelete(product)}>Eliminar</button>
        </div>
      </div>
    </article>
  );
}

ProductCard.propTypes = {
  product: PropTypes.object.isRequired,
  busy: PropTypes.bool,
  onToggleStock: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired
};
