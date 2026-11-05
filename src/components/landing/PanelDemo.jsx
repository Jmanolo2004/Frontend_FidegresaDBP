import { useState } from "react";
import { DEMO_CUSTOMERS, DEMO_METRICS, DEMO_PROGRAMS, DEMO_WEEK } from "./landingContent";

const VIEWS = [
  { id: "metrics", label: "Métricas" },
  { id: "customers", label: "Clientes" },
  { id: "programs", label: "Tarjetas" }
];

const BUSIEST_DAY = Math.max(...DEMO_WEEK.map(day => day.visits));

function MetricsView() {
  return (
    <>
      <div className="demo-metrics">
        {DEMO_METRICS.map(metric => (
          <div key={metric.label}>
            <strong>{metric.value}</strong>
            <span>{metric.label}</span>
          </div>
        ))}
      </div>
      <div className="demo-bars" role="img" aria-label="Visitas por día: el viernes es el día con más movimiento">
        {DEMO_WEEK.map(day => (
          <div key={day.day}>
            <i style={{ height: `${(day.visits / BUSIEST_DAY) * 100}%` }} className={day.visits === BUSIEST_DAY ? "is-peak" : ""} />
            <span>{day.day}</span>
          </div>
        ))}
      </div>
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
        <p className="demo-note">Datos de ejemplo.</p>
      </div>
    </section>
  );
}
