import { useEffect, useState } from "react";
import PropTypes from "prop-types";

const QUICK_RANGES = [
  ["all", "Todo el tiempo"],
  ["7days", "Hace 7 días"],
  ["14days", "Hace 14 días"],
  ["30days", "Hace 30 días"],
  ["90days", "Hace 90 días"]
];

export function MetricsFilters({ filters, update }) {
  const [open, setOpen] = useState(false);
  const [dates, setDates] = useState({ from: filters.from, to: filters.to });
  const invalidRange = Boolean(dates.from && dates.to && dates.from > dates.to);

  useEffect(() => {
    setDates({ from: filters.from, to: filters.to });
  }, [filters.from, filters.to]);

  const updateDate = (key, value) => {
    const nextDates = { ...dates, [key]: value };
    setDates(nextDates);
    if (nextDates.from && nextDates.to && nextDates.from <= nextDates.to) {
      update({ range: "custom", ...nextDates });
    }
  };

  return (
    <section className="metrics-filters" aria-label="Rango de fechas de métricas">
      <details className="metrics-calendar" open={open} onToggle={event => setOpen(event.currentTarget.open)}>
        <summary className="metrics-calendar-trigger" aria-label="Abrir calendario">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M16 3v4M8 3v4M3 10h18" />
          </svg>
          <span>Calendario</span>
          <span className="metrics-calendar-chevron" aria-hidden="true">▾</span>
        </summary>
        <div className="metrics-calendar-popover">
          <div className="metrics-calendar-presets" aria-label="Rangos rápidos">
            {QUICK_RANGES.map(([range, label]) => (
              <button
                key={range}
                type="button"
                className={filters.range === range ? "selected" : ""}
                onClick={() => {
                  update({ range });
                  setOpen(false);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="metrics-calendar-dates">
            <label>Desde<input aria-label="Fecha desde" type="date" value={dates.from} max={dates.to || undefined} aria-invalid={invalidRange} aria-describedby={invalidRange ? "metrics-range-error" : undefined} onChange={event => updateDate("from", event.target.value)} /></label>
            <span aria-hidden="true">—</span>
            <label>Hasta<input aria-label="Fecha hasta" type="date" value={dates.to} min={dates.from || undefined} aria-invalid={invalidRange} aria-describedby={invalidRange ? "metrics-range-error" : undefined} onChange={event => updateDate("to", event.target.value)} /></label>
          </div>
          {invalidRange && <p className="metrics-calendar-error" id="metrics-range-error" role="alert">La fecha "Desde" debe ser igual o anterior a "Hasta". Mientras tanto se muestra el periodo anterior.</p>}
        </div>
      </details>
    </section>
  );
}

MetricsFilters.propTypes = {
  filters: PropTypes.shape({ range: PropTypes.string, from: PropTypes.string, to: PropTypes.string }).isRequired,
  update: PropTypes.func.isRequired
};
