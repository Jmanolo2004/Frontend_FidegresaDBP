import { Component, lazy, Suspense, useState } from "react";
import PropTypes from "prop-types";
import { Skeleton } from "../common/Skeleton";

const LazyMapView = lazy(() => import("./MapView").then(module => ({ default: module.MapView })));

class MapErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    this.props.onError?.(error.message);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

MapErrorBoundary.propTypes = {
  children: PropTypes.node,
  fallback: PropTypes.node.isRequired,
  onError: PropTypes.func
};

export function GeoMap({ onError, ...props }) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const reportFailure = message => {
    setFailed(true);
    onError?.(message);
  };
  const fallback = (
    <div className={`map-view map-load-error ${props.className || ""}`} role="alert">
      <strong>No se pudo cargar el mapa de OpenStreetMap.</strong>
      <span>Comprueba tu conexión e inténtalo de nuevo.</span>
      <button className="secondary-button" type="button" onClick={() => {
        setFailed(false);
        setAttempt(previous => previous + 1);
        onError?.(null);
      }}>Intentar de nuevo</button>
    </div>
  );
  if (failed) return fallback;
  return (
    <MapErrorBoundary key={attempt} fallback={fallback} onError={reportFailure}>
      <Suspense fallback={<Skeleton height={480} radius={13} />}>
        <LazyMapView {...props} onMapError={reportFailure} />
      </Suspense>
    </MapErrorBoundary>
  );
}

GeoMap.propTypes = {
  onError: PropTypes.func,
  branch: PropTypes.object.isRequired,
  branches: PropTypes.array.isRequired,
  customers: PropTypes.array.isRequired,
  radius: PropTypes.number.isRequired,
  highlightedCustomerId: PropTypes.number,
  onBranchMove: PropTypes.func.isRequired,
  onSelectAddress: PropTypes.func,
  district: PropTypes.string,
  className: PropTypes.string,
  onViewportChange: PropTypes.func,
  ariaLabel: PropTypes.string
};
