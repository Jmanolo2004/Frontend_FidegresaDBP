import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { NavLink, useLocation } from "react-router-dom";
import { Icon } from "../common/Icon";
import { NAVIGATION_GROUPS } from "./navigation";

const items = NAVIGATION_GROUPS.flatMap(group => group.items);
const primary = ["/panel/metricas", "/panel/clientes", "/panel/tarjetas", "/panel/resenas"].map(path => items.find(item => item.to === path));
const secondary = items.filter(item => !primary.includes(item));

export function MobileNav({ onLogout }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    if (!open) {
      if (dialog.open) dialog.close();
      return undefined;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    const handleKeyDown = event => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
    };
  }, [open]);

  return (
    <>
      <nav className="mobile-bottom-nav" aria-label="Navegación principal móvil">
        {primary.map(item => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => `mobile-bottom-link${isActive ? " active" : ""}`}>
            <Icon name={item.icon} size={20} /><span>{item.label}</span>
          </NavLink>
        ))}
        <button type="button" className={`mobile-bottom-link${secondary.some(item => location.pathname.startsWith(item.to)) ? " active" : ""}`} onClick={() => setOpen(true)} aria-expanded={open} aria-controls="mobile-more-menu">
          <Icon name="menu" size={20} /><span>Más</span>
        </button>
      </nav>
      <dialog className="mobile-more-sheet" id="mobile-more-menu" ref={dialogRef} aria-labelledby="mobile-more-title" onCancel={event => { event.preventDefault(); setOpen(false); }}>
        <div className="mobile-more-heading">
          <h2 id="mobile-more-title">Más opciones</h2>
          <button type="button" className="icon-button" aria-label="Cerrar menú" onClick={() => setOpen(false)}><Icon name="close" /></button>
        </div>
        <nav aria-label="Más opciones del panel">
          {secondary.map(item => (
            <NavLink key={item.to} to={item.to} onClick={() => setOpen(false)}>
              <Icon name={item.icon} size={20} />{item.label}
            </NavLink>
          ))}
          <button type="button" onClick={() => { setOpen(false); onLogout(); }}><Icon name="logout" size={20} />Cerrar sesión</button>
        </nav>
      </dialog>
    </>
  );
}

MobileNav.propTypes = { onLogout: PropTypes.func.isRequired };
