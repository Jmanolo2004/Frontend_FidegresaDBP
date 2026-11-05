import PropTypes from "prop-types";

/** Impresión de un sello de goma con la taza de Fidegresa. */
export function StampMark({ className = "" }) {
  return (
    <svg className={`stamp-mark ${className}`} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="29" fill="none" stroke="currentColor" strokeWidth="3.5" strokeDasharray="150 6 28 4" />
      <circle cx="32" cy="32" r="23" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M19 25h21v11a10 10 0 0 1-10 10h-1a10 10 0 0 1-10-10Z" fill="currentColor" />
      <path d="M40 28h3a5 5 0 0 1 0 10h-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M26 21c-2-2 2-3 0-6M33 21c-2-2 2-3 0-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

StampMark.propTypes = { className: PropTypes.string };
