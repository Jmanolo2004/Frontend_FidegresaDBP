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

export function GeoMap({ fallback, onError, ...props }) {
  const [failed, setFailed] = useState(false);
  const reportFailure = message => {
    setFailed(true);
    onError?.(message);
  };
  if (failed) return fallback;
  return (
    <MapErrorBoundary fallback={fallback} onError={reportFailure}>
      <Suspense fallback={<Skeleton height={480} radius={13} />}>
        <LazyMapView {...props} onMapError={reportFailure} />
      </Suspense>
    </MapErrorBoundary>
  );
}

GeoMap.propTypes = {
  fallback: PropTypes.node.isRequired,
  onError: PropTypes.func,
  branch: PropTypes.object.isRequired,
  branches: PropTypes.array.isRequired,
  customers: PropTypes.array.isRequired,
  radius: PropTypes.number.isRequired,
  heatmapPoints: PropTypes.array.isRequired,
  showHeatmap: PropTypes.bool.isRequired,
  highlightedCustomerId: PropTypes.number,
  onBranchMove: PropTypes.func.isRequired,
  onSelectAddress: PropTypes.func,
  district: PropTypes.string,
  className: PropTypes.string,
  onViewportChange: PropTypes.func,
  ariaLabel: PropTypes.string
};
