import PropTypes from "prop-types";
import { Breadcrumbs } from "./Breadcrumbs";
import { Icon } from "../common/Icon";
import { formatToday, getInitials } from "../../utils/format";

export function Topbar({ profileName, noticeCount, menuOpen, onToggleMenu, onOpenNotices, onOpenProfile }) {
  return (
    <header className="topbar">
      <button type="button" className="icon-button mobile-menu" onClick={onToggleMenu} aria-label="Abrir menú" aria-expanded={menuOpen} aria-controls="sidebar">
        <Icon name="menu" />
      </button>
      <Breadcrumbs />
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
  menuOpen: PropTypes.bool.isRequired,
  onToggleMenu: PropTypes.func.isRequired,
  onOpenNotices: PropTypes.func.isRequired,
  onOpenProfile: PropTypes.func.isRequired
};
