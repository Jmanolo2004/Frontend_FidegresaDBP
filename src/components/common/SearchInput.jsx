import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Icon } from "./Icon";
import { useDebounce } from "../../hooks/useDebounce";

/** Búsqueda con debounce: solo notifica cuando la persona deja de escribir. */
export function SearchInput({ value, onSearch, placeholder, label, delay = 350 }) {
  const [text, setText] = useState(value);
  const debounced = useDebounce(text, delay);

  useEffect(() => {
    setText(value);
  }, [value]);

  useEffect(() => {
    if (debounced !== value) onSearch(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <label className="search-wrap">
      <span className="search-icon">
        <Icon name="search" size={16} />
      </span>
      <input className="search-input" type="search" aria-label={label} placeholder={placeholder} value={text} onChange={event => setText(event.target.value)} />
    </label>
  );
}

SearchInput.propTypes = {
  value: PropTypes.string.isRequired,
  onSearch: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  label: PropTypes.string.isRequired,
  delay: PropTypes.number
};
