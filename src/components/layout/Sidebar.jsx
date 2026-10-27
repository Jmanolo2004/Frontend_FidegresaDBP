import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { NavLink, useNavigate } from "react-router-dom";
import { BrandLink } from "../common/BrandLink";
import { Icon } from "../common/Icon";
import { NAVIGATION_GROUPS } from "./navigation";
import { getInitials } from "../../utils/format";

export function Sidebar({ open, profileName, onNavigate, onOpenProfile, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = event => {
      if (event.type === "keydown" ? event.key === "Escape" : !menuRef.current?.contains(event.target)) setMenuOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [menuOpen]);

  const runMenuAction = action => {
    setMenuOpen(false);
    action();
  };

  return (
    <aside className={`sidebar${open ? " open" : ""}`} id="sidebar">
      <BrandLink variant="sidebar" />
      <nav className="main-nav" aria-label="Navegación principal">
        {NAVIGATION_GROUPS.map(group => (
          <div className="nav-group" key={group.label}>
            <span className="nav-label">{group.label}</span>
            {group.items.map(item => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-link${isActive ? " active" : ""}`} onClick={onNavigate}>
                <span className="sidebar-icon">
                  <Icon name={item.icon} />
                </span>
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="profile-menu-wrap" ref={menuRef}>
          <button type="button" className="profile-mini" onClick={() => setMenuOpen(value => !value)} aria-expanded={menuOpen} aria-controls="profile-menu">
            <span className="avatar">{getInitials(profileName)}</span>
            <span>
              <strong>{profileName}</strong>
              <small>Administradora</small>
            </span>
            <span className="profile-dots">
              <Icon name="chevron" />
            </span>
          </button>
          <div className="profile-menu" id="profile-menu" hidden={!menuOpen}>
            <button type="button" onClick={() => runMenuAction(onOpenProfile)}>
              Mi perfil
            </button>
            <button type="button" onClick={() => runMenuAction(() => navigate("/panel/configuracion"))}>
              Configuración
            </button>
            <button type="button" onClick={() => runMenuAction(onLogout)}>
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

Sidebar.propTypes = {
  open: PropTypes.bool.isRequired,
  profileName: PropTypes.string.isRequired,
  onNavigate: PropTypes.func.isRequired,
  onOpenProfile: PropTypes.func.isRequired,
  onLogout: PropTypes.func.isRequired
};
