import { useState } from "react";
import { CARD_TYPES, DEMO_CUSTOMERS, DEMO_METRICS, DEMO_PROGRAMS, DEMO_WEEK } from "./landingContent";

const VIEWS = [
  { id: "metrics", label: "Métricas" },
  { id: "customers", label: "Clientes" },
  { id: "programs", label: "Tarjetas" }
];

function MetricsView() {
  const [activeProgram, setActiveProgram] = useState(CARD_TYPES[0].id);
  const selected = CARD_TYPES.find(program => program.id === activeProgram) || CARD_TYPES[0];
  const programValues = {
    stamps: [28, 38, 35, 54, 68, 61, 31],
    cashback: [18, 30, 26, 48, 62, 57, 25],
    levels: [14, 25, 30, 39, 55, 47, 22],
    gift: [10, 22, 18, 45, 70, 58, 34]
  }[activeProgram];
  const peak = Math.max(...programValues);
  return (
    <>
      <div className="demo-metrics-program-tabs" role="tablist" aria-label="Programa de ejemplo">
        {CARD_TYPES.map(program => (
          <button type="button" role="tab" aria-selected={activeProgram === program.id} key={program.id} onClick={() => setActiveProgram(program.id)}>
            {program.label}
          </button>
        ))}
      </div>
      <div className="demo-metrics">
        {DEMO_METRICS.map((metric, index) => (
          <div key={metric.label}>
            <strong>{index === 0 ? `${Math.round(programValues.reduce((sum, item) => sum + item, 0) * 1.15)}` : metric.value}</strong>
            <span>{index === 0 ? `${selected.label} · visitas` : metric.label}</span>
          </div>
        ))}
      </div>
      <div className="demo-bars demo-program-bars" role="img" aria-label={`Datos ilustrativos de visitas para ${selected.label}; el viernes es el día con más movimiento`}>
        {DEMO_WEEK.map((day, index) => (
          <div key={day.day}>
            <i style={{ height: `${(programValues[index] / peak) * 100}%`, background: selected.card.colorAcento }} className={index === 4 ? "is-peak" : ""} />
            <span>{day.day}</span>
          </div>
        ))}
      </div>
      <p className="demo-program-caption">{selected.text}</p>
    </>
  );
}

function CustomersView() {
  return (
    <table className="demo-table">
      <thead>
        <tr>
          <th>Cliente</th>
          <th>Visitas</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody>
        {DEMO_CUSTOMERS.map(customer => (
          <tr key={customer.name}>
            <td>{customer.name}</td>
            <td>{customer.visits}</td>
            <td>{customer.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ProgramsView() {
  return (
    <ul className="demo-programs">
      {DEMO_PROGRAMS.map(program => (
        <li key={program.name}>
          <div>
            <strong>{program.name}</strong>
            <span>{program.type}</span>
          </div>
          <b>{program.customers} clientes</b>
        </li>
      ))}
    </ul>
  );
}

const VIEW_COMPONENTS = { metrics: MetricsView, customers: CustomersView, programs: ProgramsView };

/** Vista ilustrativa del panel que responde a los clics, sin consultar datos reales. */
export function PanelDemo() {
  const [activeView, setActiveView] = useState(VIEWS[0].id);
  const ActiveView = VIEW_COMPONENTS[activeView];

  return (
    <section className="panel-demo" id="panel">
      <div className="lp-wrap">
        <h2>Lo que pasa en tu negocio, en una sola pantalla</h2>
        <p className="panel-demo-intro">Mira quién volvió, quién dejó de venir y qué día se llena tu local. Prueba las secciones.</p>
        <div className="demo-window">
          <div className="demo-tabs" aria-label="Secciones del panel de ejemplo">
            {VIEWS.map(view => (
              <button type="button" key={view.id} className={view.id === activeView ? "is-active" : ""} aria-pressed={view.id === activeView} onClick={() => setActiveView(view.id)}>
                {view.label}
              </button>
            ))}
          </div>
          <div className="demo-view" key={activeView}>
            <ActiveView />
          </div>
        </div>
        <p className="demo-note">Datos ilustrativos · Vista de solo lectura</p>
      </div>
    </section>
  );
}
