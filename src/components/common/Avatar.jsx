import PropTypes from "prop-types";
import { getInitials } from "../../utils/format";

export function Avatar({ name, initials, className = "customer-avatar" }) {
  return (
    <span className={className} aria-hidden="true">
      {initials || getInitials(name)}
    </span>
  );
}

Avatar.propTypes = { name: PropTypes.string, initials: PropTypes.string, className: PropTypes.string };
