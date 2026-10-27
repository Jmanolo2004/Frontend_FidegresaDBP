import { Fragment } from "react";
import { Link, useMatches } from "react-router-dom";

/** Lee el "handle.crumb" definido en la configuración de rutas. */
export function Breadcrumbs() {
  const crumbs = useMatches()
    .filter(match => match.handle?.crumb)
    .map(match => ({ path: match.pathname, label: typeof match.handle.crumb === "function" ? match.handle.crumb(match.params) : match.handle.crumb }));

  return (
    <nav className="breadcrumb" aria-label="Ubicación actual">
      <Link to="/panel/metricas">Panel</Link>
      {crumbs.map((crumb, index) => (
        <Fragment key={crumb.path}>
          <span className="crumb-divider">/</span>
          {index === crumbs.length - 1 ? (
            <strong aria-current="page">{crumb.label}</strong>
          ) : (
            <Link to={crumb.path}>{crumb.label}</Link>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
