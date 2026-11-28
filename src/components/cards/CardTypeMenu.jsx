import { useEffect, useId, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Icon } from "../common/Icon";
import { CARD_TYPE_CONFIG, CARD_TYPE_KEYS } from "./cardTypes";

/** Botón "Todos" junto a Crear tarjeta: despliega los tipos de tarjeta con cuántos programas tiene cada uno. */
export function CardTypeMenu({ value, counts, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const menuId = useId();
  const options = [
    { value: "Todas", label: "Todos", icon: "card", count: counts.total },
    ...CARD_TYPE_KEYS.map(type => ({ value: type, label: CARD_TYPE_CONFIG[type].label, icon: CARD_TYPE_CONFIG[type].icon, count: counts[type] }))
  ];
  const current = options.find(option => option.value === value) || options[0];

  useEffect(() => {
    if (!open) return undefined;
    const closeOutside = event => { if (!rootRef.current?.contains(event.target)) setOpen(false); };
    const closeOnEscape = event => {
      if (event.key !== "Escape") return;
      setOpen(false);
      rootRef.current?.querySelector("button")?.focus();
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const choose = option => {
    onChange(option.value);
    setOpen(false);
    rootRef.current?.querySelector("button")?.focus();
  };

  const moveFocus = (event, index) => {
    const items = rootRef.current?.querySelectorAll("[role='menuitemradio']");
    if (!items?.length) return;
    const next = event.key === "ArrowDown" ? (index + 1) % items.length
      : event.key === "ArrowUp" ? (index - 1 + items.length) % items.length
        : event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : -1;
    if (next < 0) return;
    event.preventDefault();
    items[next].focus();
  };

  return (
    <div className="card-type-menu" ref={rootRef}>
      <button
        type="button"
        className="card-type-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen(previous => !previous)}
        onKeyDown={event => {
          if (event.key !== "ArrowDown") return;
          event.preventDefault();
          setOpen(true);
          requestAnimationFrame(() => rootRef.current?.querySelector("[role='menuitemradio']")?.focus());
        }}
      >
        <Icon name={current.icon} size={16} />
        <span>{current.label}</span>
        <Icon name="chevron" size={15} className={open ? "card-type-menu-chevron open" : "card-type-menu-chevron"} />
      </button>
      {open && (
        <div className="card-type-menu-list" id={menuId} role="menu" aria-label="Mostrar tarjetas por tipo">
          {options.map((option, index) => (
            <button
              type="button"
              role="menuitemradio"
              aria-checked={option.value === current.value}
              key={option.value}
              className={option.value === current.value ? "selected" : ""}
              onClick={() => choose(option)}
              onKeyDown={event => moveFocus(event, index)}
            >
              <span className="card-type-menu-icon"><Icon name={option.icon} size={15} /></span>
              <span>{option.label}</span>
              <span className="card-type-menu-count">{option.count ?? "…"}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

CardTypeMenu.propTypes = {
  value: PropTypes.string.isRequired,
  counts: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired
};
