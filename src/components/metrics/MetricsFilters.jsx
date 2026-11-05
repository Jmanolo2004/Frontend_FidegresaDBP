import PropTypes from "prop-types";
import { Icon } from "../common/Icon";

export const PROGRAM_TABS = [
  { key: "all", label: "General", icon: "chart", color: "#603f2a" },
  { key: "stamps", label: "Estampillas", icon: "star", color: "#603f2a" },
  { key: "cashback", label: "Cashback", icon: "card", color: "#c8894f" },
  { key: "tiers", label: "Niveles", icon: "users", color: "#4e8066" },
  { key: "giftcard", label: "Gift card", icon: "reward", color: "#8a5a7a" }
];

const RANGES = [
  ["today", "Hoy"], ["7days", "7 días"], ["30days", "30 días"], ["month", "Este mes"],
  ["quarter", "Trimestre"], ["year", "Este año"], ["custom", "Personalizado"]
];

export function ProgramTabs({ value, onChange }) {
  return (
    <div className="metrics-program-tabs" role="tablist" aria-label="Programa de fidelización">
      {PROGRAM_TABS.map(tab => (
        <button key={tab.key} type="button" role="tab" aria-selected={value === tab.key} className={value === tab.key ? "selected" : ""} style={{ "--program-accent": tab.color }} onClick={() => onChange(tab.key)}>
          <Icon name={tab.icon} size={16} /><span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

ProgramTabs.propTypes = { value: PropTypes.string.isRequired, onChange: PropTypes.func.isRequired };

export function MetricsFilters({ filters, update, branches, onExport }) {
  return (
    <section className="metrics-filters panel" aria-label="Filtros de métricas">
      <ProgramTabs value={filters.program} onChange={program => update({ program })} />
      <div className="metrics-filter-controls">
        <label>Periodo
          <select value={filters.range} onChange={event => update({ range: event.target.value })}>
            {RANGES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select>
        </label>
        {filters.range === "custom" && <>
          <label>Desde <input aria-label="Fecha desde" type="date" value={filters.from} onChange={event => update({ from: event.target.value })} /></label>
          <label>Hasta <input aria-label="Fecha hasta" type="date" value={filters.to} onChange={event => update({ to: event.target.value })} /></label>
        </>}
        <label>Comparar con
          <select value={filters.compare} onChange={event => update({ compare: event.target.value })}>
            <option value="previous">Periodo anterior</option>
            <option value="lastYear">Mismo periodo del año pasado</option>
          </select>
        </label>
        <label>Local
          <select value={filters.branchId} onChange={event => update({ branchId: event.target.value })}>
            <option value="">Todos los locales</option>
            {branches.map(branch => <option key={branch.id} value={branch.id}>{branch.nombre}</option>)}
          </select>
        </label>
        <div className="metrics-export-actions">
          <button type="button" className="secondary-button" onClick={onExport}>Exportar CSV</button>
          <button type="button" className="secondary-button" onClick={() => window.print()}>Imprimir / PDF</button>
        </div>
      </div>
    </section>
  );
}

MetricsFilters.propTypes = {
  filters: PropTypes.shape({ program: PropTypes.string, range: PropTypes.string, from: PropTypes.string, to: PropTypes.string, compare: PropTypes.string, branchId: PropTypes.string }).isRequired,
  update: PropTypes.func.isRequired,
  branches: PropTypes.arrayOf(PropTypes.object).isRequired,
  onExport: PropTypes.func.isRequired
};
