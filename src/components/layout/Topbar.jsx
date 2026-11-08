import PropTypes from "prop-types";
import { useSearchParams } from "react-router-dom";
import { Breadcrumbs } from "./Breadcrumbs";
import { Icon } from "../common/Icon";
import { formatToday, getInitials } from "../../utils/format";

export function Topbar({ profileName, noticeCount, branches, branchesError, menuOpen, onToggleMenu, onOpenNotices, onOpenProfile }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const branchId = searchParams.get("branchId") || "";

  const selectBranch = event => {
    const next = new URLSearchParams(searchParams);
    if (event.target.value) next.set("branchId", event.target.value);
    else next.delete("branchId");
    setSearchParams(next, { replace: true });
  };

  return (
    <header className="topbar">
      <div className="topbar-leading">
        <button type="button" className="icon-button mobile-menu" onClick={onToggleMenu} aria-label="Abrir menú" aria-expanded={menuOpen} aria-controls="sidebar">
          <Icon name="menu" />
        </button>
        <Breadcrumbs />
      </div>
      <label className={`topbar-location-picker${branchesError ? " has-error" : ""}`} title={branchesError?.message}>
        <Icon name="pin" size={16} />
        <span>Seleccionar Ubicación:</span>
        <select value={branchId} onChange={selectBranch} aria-label={branchesError ? `No se pudieron cargar las ubicaciones: ${branchesError.message}` : "Seleccionar ubicación"} disabled={Boolean(branchesError)}>
          <option value="">{branchesError ? "No disponibles" : "Todos los locales"}</option>
          {branches.map(branch => <option key={branch.id} value={branch.id}>{branch.nombre}</option>)}
        </select>
        <Icon name="chevron" size={15} />
      </label>
      <div className="topbar-actions">
        <span className="today-label">{formatToday()}</span>
        <button type="button" className="icon-button notification-button" onClick={onOpenNotices} aria-label={`Avisos del negocio: ${noticeCount}`}>
          <Icon name="bell" />
          <span className="notification-count" hidden={noticeCount === 0}>
            {noticeCount > 9 ? "9+" : noticeCount}
          </span>
        </button>
        <button type="button" className="top-avatar" onClick={onOpenProfile} aria-label="Abrir perfil">
          {getInitials(profileName)}
        </button>
      </div>
    </header>
  );
}

Topbar.propTypes = {
  profileName: PropTypes.string.isRequired,
  noticeCount: PropTypes.number.isRequired,
  branches: PropTypes.arrayOf(PropTypes.object).isRequired,
  branchesError: PropTypes.object,
  menuOpen: PropTypes.bool.isRequired,
  onToggleMenu: PropTypes.func.isRequired,
  onOpenNotices: PropTypes.func.isRequired,
  onOpenProfile: PropTypes.func.isRequired
};
