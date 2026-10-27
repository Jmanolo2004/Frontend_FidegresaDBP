import { useRef, useState } from "react";
import PropTypes from "prop-types";
import { Icon } from "../common/Icon";
import { MAP_METERS_PER_UNIT } from "../../utils/constants";
import { clampMapPoint } from "../../utils/geo";

const DISTRICT_LABELS = [
  { name: "BARRANCO", x: 230, y: 615 },
  { name: "MIRAFLORES", x: 385, y: 385 },
  { name: "SAN ISIDRO", x: 650, y: 185 },
  { name: "SAN BORJA", x: 620, y: 505 },
  { name: "SANTIAGO DE SURCO", x: 795, y: 605 }
];
const ROADS = [
  "M132 229C325 211 440 236 595 202S831 162 1000 183",
  "M160 450C357 408 478 425 628 394S847 339 1000 352",
  "M400 0C414 143 452 257 489 367S556 569 578 700",
  "M740 0C705 144 719 269 748 385S818 597 850 700"
];
const KEY_STEPS = { ArrowLeft: [-12, 0], ArrowRight: [12, 0], ArrowUp: [0, -12], ArrowDown: [0, 12] };

/** Mapa vectorial de Lima con un pin arrastrable (mouse, táctil o flechas del teclado). */
export function LimaMap({ location, customers, radius, onMove, onMoveEnd, onCenter }) {
  const svgRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const pointFromEvent = event => {
    const matrix = svgRef.current?.getScreenCTM();
    if (!matrix) return null;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return { x: clampMapPoint(point.x, 45, 955), y: clampMapPoint(point.y, 45, 655) };
  };

  const startDrag = event => {
    event.preventDefault();
    svgRef.current?.setPointerCapture(event.pointerId);
    setDragging(true);
  };

  const drag = event => {
    if (!dragging) return;
    const point = pointFromEvent(event);
    if (point) onMove(point);
  };

  const endDrag = event => {
    if (!dragging) return;
    setDragging(false);
    const point = pointFromEvent(event);
    onMoveEnd(point || { x: location.mapX, y: location.mapY });
  };

  const handleKey = event => {
    const step = KEY_STEPS[event.key];
    if (!step) return;
    event.preventDefault();
    const point = { x: clampMapPoint(location.mapX + step[0], 45, 955), y: clampMapPoint(location.mapY + step[1], 45, 655) };
    onMove(point);
    onMoveEnd(point);
  };

  return (
    <div className="map-canvas">
      <svg
        ref={svgRef}
        className={`lima-map-svg${dragging ? " is-dragging" : ""}`}
        viewBox="0 0 1000 700"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Mapa de Barranco, Miraflores, San Isidro, San Borja y Surco. Arrastra el pin marrón para medir el alcance."
        onPointerMove={drag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <defs>
          <pattern id="lima-street-grid" width="112" height="88" patternUnits="userSpaceOnUse">
            <rect width="112" height="88" fill="#f2f2ec" />
            <path d="M0 13H112M0 75H112M16 0V88M98 0V88" stroke="#fff" strokeWidth="7" />
            <path d="M0 13H112M0 75H112M16 0V88M98 0V88" stroke="#e6e4dc" strokeWidth="1" />
          </pattern>
          <filter id="map-pin-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#51463a" floodOpacity=".32" />
          </filter>
        </defs>
        <g className="lima-map-vector">
          <rect width="1000" height="700" fill="url(#lima-street-grid)" />
          <path className="lima-water" d="M0 0H115Q142 86 106 159T128 310Q93 384 129 480T103 700H0Z" />
          <path className="lima-coastline" d="M115 0Q142 86 106 159T128 310Q93 384 129 480T103 700" />
          <path className="lima-park" d="M492 76Q554 42 610 80L626 143Q570 168 509 144Z" />
          <path className="lima-park" d="M703 355Q758 326 818 360L831 418Q775 446 715 416Z" />
          <path className="lima-park" d="M399 512Q451 483 492 517L481 565Q430 580 395 550Z" />
          {ROADS.map(road => (
            <path key={`road-${road}`} className="lima-main-road" d={road} />
          ))}
          {ROADS.map(road => (
            <path key={`center-${road}`} className="lima-road-center" d={road} />
          ))}
          <path className="lima-district-border" d="M130 330C320 314 481 330 638 294S836 249 1000 270" />
          <path className="lima-district-border" d="M171 520C357 491 513 505 666 476S858 430 1000 447" />
          {DISTRICT_LABELS.map(label => (
            <text key={label.name} className="lima-district-label" x={label.x} y={label.y}>
              {label.name}
            </text>
          ))}
          <text className="lima-map-label" x="22" y="112">
            OCÉANO PACÍFICO
          </text>
          <text className="lima-map-label" x="770" y="74">
            LIMA · PERÚ
          </text>
          <circle className="map-reach-circle" cx={location.mapX} cy={location.mapY} r={radius / MAP_METERS_PER_UNIT} />
          {customers.map(person => (
            <g key={person.id} className={`lima-customer-marker${person.distance <= radius ? " in-range" : " out-of-range"}`} transform={`translate(${person.mapX} ${person.mapY})`} aria-hidden="true">
              <circle r="18" />
              <text y="4">{person.iniciales}</text>
              <title>{`${person.nombre} · ${person.distrito} · ${person.distance} m`}</title>
            </g>
          ))}
        </g>
        <g
          className="map-business-marker"
          transform={`translate(${location.mapX} ${location.mapY})`}
          tabIndex={0}
          role="button"
          aria-label={`Pin de ${location.nombre}. Arrastra o usa las flechas para moverlo y medir el alcance.`}
          onPointerDown={startDrag}
          onKeyDown={handleKey}
        >
          <path className="map-business-pin" d="M0 30C-5 20-24 6-24-9a24 24 0 1 1 48 0C24 6 5 20 0 30Z" filter="url(#map-pin-shadow)" />
          <circle className="map-business-pin-core" r="10" />
          <circle className="map-business-pin-dot" r="3" />
        </g>
      </svg>
      <span className="map-region-chip">
        <Icon name="pin" size={14} /> Lima Metropolitana
      </span>
      <div className="map-toolbar">
        <button className="secondary-button" type="button" onClick={onCenter}>
          <Icon name="target" size={16} />
          Centrar mapa
        </button>
      </div>
      <span className="map-credit">Mapa ilustrativo · ubicaciones aproximadas por distrito</span>
      <span className="map-drag-hint">Arrastra el pin marrón para mover tu local</span>
    </div>
  );
}

LimaMap.propTypes = {
  location: PropTypes.shape({ nombre: PropTypes.string, mapX: PropTypes.number, mapY: PropTypes.number }).isRequired,
  customers: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.number, mapX: PropTypes.number, mapY: PropTypes.number, distance: PropTypes.number })).isRequired,
  radius: PropTypes.number.isRequired,
  onMove: PropTypes.func.isRequired,
  onMoveEnd: PropTypes.func.isRequired,
  onCenter: PropTypes.func.isRequired
};
