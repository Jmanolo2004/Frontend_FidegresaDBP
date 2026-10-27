import PropTypes from "prop-types";

export function Skeleton({ width = "100%", height = 14, radius = 6, className = "" }) {
  return <span className={`skeleton ${className}`} style={{ width, height, borderRadius: radius }} aria-hidden="true" />;
}

Skeleton.propTypes = {
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  radius: PropTypes.number,
  className: PropTypes.string
};

export function KpiSkeletonGrid({ count = 4 }) {
  return (
    <div className="stats-grid" aria-busy="true" aria-label="Cargando indicadores">
      {Array.from({ length: count }, (_, index) => (
        <article className="kpi-card" key={index}>
          <Skeleton width="55%" height={12} />
          <Skeleton width="45%" height={28} className="skeleton-gap" />
          <Skeleton width="80%" height={10} className="skeleton-gap" />
        </article>
      ))}
    </div>
  );
}

KpiSkeletonGrid.propTypes = { count: PropTypes.number };

export function TableSkeleton({ rows = 6 }) {
  return (
    <div className="table-skeleton" aria-busy="true" aria-label="Cargando registros">
      {Array.from({ length: rows }, (_, index) => (
        <div className="table-skeleton-row" key={index}>
          <Skeleton width={30} height={30} radius={15} />
          <Skeleton width="28%" />
          <Skeleton width="22%" />
          <Skeleton width="14%" />
          <Skeleton width="10%" />
        </div>
      ))}
    </div>
  );
}

TableSkeleton.propTypes = { rows: PropTypes.number };

export function PageSkeleton() {
  return (
    <div className="page-skeleton" aria-busy="true" aria-label="Cargando sección">
      <Skeleton width={220} height={32} />
      <Skeleton width="45%" height={12} className="skeleton-gap" />
      <KpiSkeletonGrid />
      <article className="panel skeleton-panel">
        <TableSkeleton rows={5} />
      </article>
    </div>
  );
}
