import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { calendarDays, inclusiveDayCount, parseLocalDate, shiftMonth } from "../../utils/metricsDates";

const QUICK_RANGES = [
  ["all", "Todo el tiempo"],
  ["7days", "Últimos 7 días"],
  ["14days", "Últimos 14 días"],
  ["30days", "Últimos 30 días"],
  ["90days", "Últimos 90 días"]
];
const WEEKDAYS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];
const monthFormat = new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric" });
const shortFormat = new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", year: "numeric" });
const dayFormat = new Intl.DateTimeFormat("es-PE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

function firstVisibleMonth(from, to) {
  const end = parseLocalDate(to);
  const sameMonth = from.slice(0, 7) === to.slice(0, 7);
  return shiftMonth(end, sameMonth ? 0 : -1);
}

function CalendarMonth({ month, from, to, onSelect }) {
  const title = monthFormat.format(month);
  return (
    <section className="metrics-calendar-month" aria-label={title}>
      <h3>{title}</h3>
      <div className="metrics-calendar-grid">
        {WEEKDAYS.map(day => <span className="metrics-calendar-weekday" key={day} aria-hidden="true">{day}</span>)}
        {calendarDays(month).map(({ date, value, inMonth }) => {
          const selected = inMonth && value >= from && value <= to;
          const endpoint = selected && (value === from || value === to);
          return (
            <button
              key={value}
              type="button"
              disabled={!inMonth}
              className={`${selected ? "selected" : ""}${endpoint ? " endpoint" : ""}`}
              aria-label={dayFormat.format(date)}
              aria-pressed={selected}
              onClick={() => onSelect(value)}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </section>
  );
}

CalendarMonth.propTypes = {
  month: PropTypes.instanceOf(Date).isRequired,
  from: PropTypes.string.isRequired,
  to: PropTypes.string.isRequired,
  onSelect: PropTypes.func.isRequired
};

export function MetricsFilters({ filters, update }) {
  const [open, setOpen] = useState(false);
  const [pendingStart, setPendingStart] = useState(null);
  const [month, setMonth] = useState(() => firstVisibleMonth(filters.from, filters.to));
  const calendarRef = useRef(null);
  const summaryRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    setMonth(firstVisibleMonth(filters.from, filters.to));
    setPendingStart(null);
    const closeOnOutsideClick = event => {
      if (!calendarRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = event => {
      if (event.key === "Escape") {
        setOpen(false);
        summaryRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const selectDay = value => {
    if (!pendingStart) {
      setPendingStart(value);
      return;
    }
    const from = value < pendingStart ? value : pendingStart;
    const to = value < pendingStart ? pendingStart : value;
    setPendingStart(null);
    update({ range: "custom", from, to });
  };
  const from = pendingStart || filters.from;
  const to = pendingStart || filters.to;
  const count = inclusiveDayCount(from, to);
  const rangeLabel = filters.from === filters.to
    ? shortFormat.format(parseLocalDate(filters.from))
    : `${shortFormat.format(parseLocalDate(filters.from))} – ${shortFormat.format(parseLocalDate(filters.to))}`;

  return (
    <section className="metrics-filters" aria-label="Rango de fechas de métricas">
      <details className="metrics-calendar" ref={calendarRef} open={open} onToggle={event => setOpen(event.currentTarget.open)}>
        <summary ref={summaryRef} className="metrics-calendar-trigger" aria-label={`${open ? "Cerrar" : "Abrir"} calendario, ${rangeLabel}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M16 3v4M8 3v4M3 10h18" />
          </svg>
          <span>{rangeLabel}</span>
          <span className="metrics-calendar-chevron" aria-hidden="true">▾</span>
        </summary>
        <div className="metrics-calendar-popover">
          <div className="metrics-calendar-presets" aria-label="Rangos rápidos">
            {QUICK_RANGES.map(([range, label]) => (
              <button
                key={range}
                type="button"
                className={filters.range === range ? "selected" : ""}
                aria-pressed={filters.range === range}
                onClick={() => {
                  update({ range });
                  setOpen(false);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="metrics-calendar-navigation">
            <div>
              <button type="button" aria-label="Año anterior" onClick={() => setMonth(current => shiftMonth(current, -12))}>«</button>
              <button type="button" aria-label="Mes anterior" onClick={() => setMonth(current => shiftMonth(current, -1))}>‹</button>
            </div>
            <span>Selecciona el inicio y el fin</span>
            <div>
              <button type="button" aria-label="Mes siguiente" onClick={() => setMonth(current => shiftMonth(current, 1))}>›</button>
              <button type="button" aria-label="Año siguiente" onClick={() => setMonth(current => shiftMonth(current, 12))}>»</button>
            </div>
          </div>
          <div className="metrics-calendar-months">
            <CalendarMonth month={month} from={from} to={to} onSelect={selectDay} />
            <CalendarMonth month={shiftMonth(month, 1)} from={from} to={to} onSelect={selectDay} />
          </div>
          <div className="metrics-calendar-footer">
            <span aria-live="polite">{pendingStart ? "Elige la fecha final" : `${count} ${count === 1 ? "día seleccionado" : "días seleccionados"}`}</span>
            <button type="button" onClick={() => {
              setPendingStart(null);
              update({ range: "year" });
              setOpen(false);
            }}>Restaurar</button>
          </div>
        </div>
      </details>
    </section>
  );
}

MetricsFilters.propTypes = {
  filters: PropTypes.shape({ range: PropTypes.string.isRequired, from: PropTypes.string.isRequired, to: PropTypes.string.isRequired }).isRequired,
  update: PropTypes.func.isRequired
};
