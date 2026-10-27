import PropTypes from "prop-types";
import { Icon } from "./Icon";

export function Stars({ score, label }) {
  return (
    <span className="stars" aria-label={label || `${score} de 5 estrellas`} role="img">
      {Array.from({ length: 5 }, (_, index) => (
        <span key={index} className={index < Math.round(score) ? "star-on" : "star-off"}>
          <Icon name="star" size={14} />
        </span>
      ))}
    </span>
  );
}

Stars.propTypes = { score: PropTypes.number.isRequired, label: PropTypes.string };
