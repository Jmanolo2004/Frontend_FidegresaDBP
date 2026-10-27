import PropTypes from "prop-types";

export function StatusPill({ children, variant = "active" }) {
  const modifier = variant === "inactive" ? " inactive" : variant === "pending" ? " pending" : "";
  return <span className={`status-pill${modifier}`}>{children}</span>;
}

StatusPill.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(["active", "inactive", "pending"])
};
