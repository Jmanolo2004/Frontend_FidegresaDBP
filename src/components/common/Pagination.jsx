import PropTypes from "prop-types";
import { Icon } from "./Icon";
import { PAGE_SIZE_OPTIONS } from "../../utils/constants";

function visiblePages(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index);
  const pages = new Set([0, total - 1, current, current - 1, current + 1]);
  const sorted = [...pages].filter(page => page >= 0 && page < total).sort((first, second) => first - second);
  return sorted.flatMap((page, index) => (index > 0 && page - sorted[index - 1] > 1 ? ["gap-" + page, page] : [page]));
}

/** Controles para respuestas paginadas del backend ({ content, totalElements, totalPages, number, size }). */
export function Pagination({ page, totalPages, totalElements, size, onPageChange, onSizeChange, itemLabel = "resultados" }) {
  if (!totalElements) return null;
  const from = page * size + 1;
  const to = Math.min(totalElements, from + size - 1);

  return (
    <nav className="pagination" aria-label="Paginación">
      <span className="pagination-info">
        Mostrando <strong>{from}–{to}</strong> de <strong>{totalElements}</strong> {itemLabel}
      </span>
      <div className="pagination-pages">
        <button type="button" className="page-button" onClick={() => onPageChange(page - 1)} disabled={page === 0} aria-label="Página anterior">
          <Icon name="chevronLeft" size={15} />
        </button>
        {visiblePages(page, totalPages).map(item =>
          typeof item === "string" ? (
            <span key={item} className="page-gap" aria-hidden="true">
              …
            </span>
          ) : (
            <button
              type="button"
              key={item}
              className={`page-button${item === page ? " current" : ""}`}
              onClick={() => onPageChange(item)}
              aria-current={item === page ? "page" : undefined}
              aria-label={`Página ${item + 1}`}
            >
              {item + 1}
            </button>
          )
        )}
        <button type="button" className="page-button" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages - 1} aria-label="Página siguiente">
          <Icon name="chevronRight" size={15} />
        </button>
      </div>
      <label className="page-size">
        <span>Por página</span>
        <select className="filter-select" value={size} onChange={event => onSizeChange(Number(event.target.value))}>
          {PAGE_SIZE_OPTIONS.map(option => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    </nav>
  );
}

Pagination.propTypes = {
  page: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  totalElements: PropTypes.number.isRequired,
  size: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
  onSizeChange: PropTypes.func.isRequired,
  itemLabel: PropTypes.string
};
