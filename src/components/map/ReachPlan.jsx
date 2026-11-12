import PropTypes from "prop-types";
import { formatDistance } from "../../utils/mapUtils";

const VIEW = 100;
const METERS_PER_DEGREE_LAT = 110540;

// Convierte la posición real del cliente en un punto del plano, tomando el local como centro.
function toPlane(center, customer, scale) {
  const metersPerDegreeLng = 111320 * Math.cos((Number(center.lat) * Math.PI) / 180);
  const east = (Number(customer.longitud) - Number(center.lng)) * metersPerDegreeLng;
  const north = (Number(customer.latitud) - Number(center.lat)) * METERS_PER_DEGREE_LAT;
  let x = east * scale;
  let y = -north * scale;
  const length = Math.hypot(x, y);
  const limit = VIEW - 6;
  if (length > limit) {
    x = (x / length) * limit;
    y = (y / length) * limit;
  }
  return { x, y };
}

function customerState(customer, radius) {
  if (customer.distance > radius) return "outside";
  return customer.consentimientoUbicacion && customer.notificacionesActivas ? "reachable" : "muted";
}

export function ReachPlan({ branch, customers, radius, highlightedCustomerId, address }) {
  const center = { lat: Number(branch.latitud), lng: Number(branch.longitud) };
  const farthest = customers.reduce((max, customer) => Math.max(max, customer.distance), 0);
  const extent = Math.min(Math.max(radius * 1.35, farthest * 1.1, 300), 4000);
  const scale = (VIEW - 6) / extent;
  const radiusSize = radius * scale;
  const inside = customers.filter(customer => customer.distance <= radius);
  const reachable = inside.filter(customer => customerState(customer, radius) === "reachable").length;
  const ordered = [...customers].sort((first, second) => Number(first.id === highlightedCustomerId) - Number(second.id === highlightedCustomerId));
  const osmUrl = `https://www.openstreetmap.org/?mlat=${center.lat}&mlon=${center.lng}#map=16/${center.lat}/${center.lng}`;

  return (
    <div className="reach-plan">
      <div className="reach-plan-head">
        <strong>Plano de alcance</strong>
        <span>El mapa de calles no cargó. Este plano usa la distancia real de cada cliente al local.</span>
      </div>
      <svg
        className="reach-plan-svg"
        viewBox={`${-VIEW} ${-VIEW} ${VIEW * 2} ${VIEW * 2}`}
        role="img"
        aria-label={`${branch.nombre}: ${inside.length} clientes dentro de ${formatDistance(radius)}, ${reachable} pueden recibir avisos.`}
      >
        <defs>
          <pattern id="reach-plan-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M20 0H0V20" className="reach-plan-grid-line" />
          </pattern>
        </defs>
        <rect x={-VIEW} y={-VIEW} width={VIEW * 2} height={VIEW * 2} fill="url(#reach-plan-grid)" />
        <circle r={radiusSize} className="reach-plan-radius" />
        <text x="0" y={-radiusSize - 2.5} className="reach-plan-radius-label">{formatDistance(radius)}</text>
        {ordered.map(customer => {
          const point = toPlane(center, customer, scale);
          const state = customerState(customer, radius);
          const highlighted = customer.id === highlightedCustomerId;
          return (
            <g key={customer.id} transform={`translate(${point.x.toFixed(2)} ${point.y.toFixed(2)})`} className={`reach-plan-customer is-${state}${highlighted ? " is-highlighted" : ""}`}>
              {highlighted && <circle r="6.5" className="reach-plan-halo" />}
              <circle r={highlighted ? 3.6 : 2.6} />
              {highlighted && <text y="-8" className="reach-plan-name">{customer.nombre.split(" ")[0]} · {formatDistance(customer.distance)}</text>}
            </g>
          );
        })}
        <g className="reach-plan-branch">
          <circle r="5.5" />
          <circle r="2" className="reach-plan-branch-dot" />
          <text y="12" className="reach-plan-branch-label">{branch.nombre}</text>
        </g>
      </svg>
      <ul className="reach-plan-legend" aria-label="Leyenda del plano">
        <li className="is-reachable">Puede recibir avisos</li>
        <li className="is-muted">Dentro, sin avisos</li>
        <li className="is-outside">Fuera del radio</li>
      </ul>
      <p className="reach-plan-foot">{address} · <a href={osmUrl} target="_blank" rel="noreferrer">Ver calles en OpenStreetMap</a></p>
    </div>
  );
}

ReachPlan.propTypes = {
  branch: PropTypes.shape({ nombre: PropTypes.string.isRequired, latitud: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired, longitud: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired }).isRequired,
  customers: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.number.isRequired, nombre: PropTypes.string.isRequired, distance: PropTypes.number.isRequired })).isRequired,
  radius: PropTypes.number.isRequired,
  highlightedCustomerId: PropTypes.number,
  address: PropTypes.string
};
