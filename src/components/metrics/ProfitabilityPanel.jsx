import { useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import { Link, useNavigate } from "react-router-dom";
import { ErrorState } from "../common/ErrorState";
import { Icon } from "../common/Icon";
import { Skeleton } from "../common/Skeleton";
import { useFetch } from "../../hooks/useFetch";
import { metricsService } from "../../services/metricsService";
import { formatDate, formatMoney, formatNumber } from "../../utils/format";
import { parseLocalDate } from "../../utils/metricsDates";

const PERIOD_LABELS = { month: "Este mes", today: "Hoy", year: "Este año", all: "En todo el tiempo" };

function Change({ label, current, previous, comparison }) {
  if (!(previous > 0) || current === null) {
    return <span className="profitability-change trend-new">{label}: sin datos para comparar</span>;
  }
  const change = Math.round(((current - previous) / previous) * 1000) / 10;
  const direction = change > 0 ? "up" : change < 0 ? "down" : "new";
  const word = change > 0 ? "subió" : change < 0 ? "bajó" : "sin cambios";
  return (
    <span className={`profitability-change trend-${direction}`}>
      {label}: <span aria-hidden="true">{change > 0 ? "▲" : change < 0 ? "▼" : "="}</span>
      <span className="sr-only">{word}</span> {Math.abs(change)} % {comparison}
    </span>
  );
}

Change.propTypes = {
  label: PropTypes.string.isRequired,
  current: PropTypes.number,
  previous: PropTypes.number,
  comparison: PropTypes.string.isRequired
};

function CalculationHelp() {
  return (
    <details className="profitability-help">
      <summary>¿Cómo se calcula?</summary>
      <dl>
        <div><dt>Cliente recurrente</dt><dd>Tiene 2 o más visitas o compras escaneadas en el periodo.</dd></div>
        <div><dt>Ventas de clientes recurrentes</dt><dd>Suma de sus compras registradas en el periodo. En Estampillas, si no hay monto, se usa visitas × ticket promedio del programa.</dd></div>
        <div><dt>Costo de premios</dt><dd>Canjes × costo del premio + cashback usado + descuentos aplicados.</dd></div>
        <div><dt>Retorno</dt><dd>Ventas de clientes recurrentes ÷ costo de premios.</dd></div>
      </dl>
    </details>
  );
}

function ProgramsTable({ rows }) {
  return (
    <div className="metrics-activity-table">
      <div className="table-wrap">
        <table className="data-table">
          <caption className="sr-only">Rentabilidad por programa</caption>
          <thead><tr><th>Programa</th><th>Clientes recurrentes</th><th>Ventas</th><th>Costo de premios</th><th>Retorno</th></tr></thead>
          <tbody>{rows.map(row => (
            <tr key={row.programId ?? "none"}>
              <td data-label="Programa">
                <span className="profitability-program">
                  {row.programId ? <Link className="customer-link" to={`/panel/tarjetas/${row.programId}`}>{row.name}</Link> : row.name}
                  {row.type && <small>{row.type} · {row.branchName}</small>}
                </span>
              </td>
              <td data-label="Clientes recurrentes">{formatNumber(row.recurringCustomers)}</td>
              <td data-label="Ventas">{formatMoney(row.recurringSales)}</td>
              <td data-label="Costo de premios">{row.missingRewardCost ? "Falta el costo" : formatMoney(row.rewardsCost)}</td>
              <td data-label="Retorno">{row.returnRatio === null ? "—" : formatMoney(row.returnRatio)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

ProgramsTable.propTypes = { rows: PropTypes.array.isRequired };

export function ProfitabilityPanel({ range, from, to, branchId }) {
  const navigate = useNavigate();
  const params = useMemo(() => ({ from, to, branchId }), [from, to, branchId]);
  const getProfitability = useCallback(({ signal }) => metricsService.getProfitability(params, { signal }), [params]);
  const { data, error, loading, reload } = useFetch(getProfitability, [params]);

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return <Skeleton height={260} />;

  const { previousPeriod } = data;
  const comparison = range === "month" ? "frente al mes anterior" : "frente al periodo anterior";
  const incomplete = data.byProgram.filter(row => row.missingRewardCost);
  // Sin el costo de algún premio, el retorno sale más alto de lo real.
  const isPartial = incomplete.length > 0;
  const hasMovements = data.recurringSales > 0 || data.rewardsCost > 0;

  return (
    <section className="panel profitability-panel metrics-content-section" aria-label="Rentabilidad" aria-busy={loading}>
      <div className="profitability-highlight">
        <div>
          <p className="profitability-sentence">
            {hasMovements
              ? <>{PERIOD_LABELS[range] || "En este periodo"} tus clientes fieles gastaron <strong>{formatMoney(data.recurringSales)}</strong> y los premios te costaron <strong>{formatMoney(data.rewardsCost)}</strong>.</>
              : "Aún no hay ventas de clientes fieles ni premios canjeados en este periodo."}
          </p>
          <div className="profitability-changes">
            {!isPartial && <Change label="Retorno" current={data.returnRatio} previous={previousPeriod.returnRatio} comparison={comparison} />}
            <Change label="Ventas" current={data.recurringSales} previous={previousPeriod.recurringSales} comparison={comparison} />
          </div>
          <p className="profitability-note">
            {formatNumber(data.recurringCustomers)} {data.recurringCustomers === 1 ? "cliente recurrente" : "clientes recurrentes"}
            {range !== "all" && <> · se compara con {formatDate(parseLocalDate(previousPeriod.from))} – {formatDate(parseLocalDate(previousPeriod.to))}</>}
          </p>
        </div>
        <div className="profitability-return">
          <span>{isPartial ? "Retorno parcial" : "Retorno"}</span>
          <strong>{data.returnRatio === null ? "—" : formatMoney(data.returnRatio)}</strong>
          <small>{isPartial ? "Falta el costo de algún premio" : data.returnRatio === null ? "Aún sin canjes en el periodo" : `Por cada S/ 1 en premios, volvieron ${formatMoney(data.returnRatio)}`}</small>
        </div>
      </div>

      <CalculationHelp />

      {incomplete.map(row => (
        <div className="profitability-alert" role="status" key={row.programId}>
          <Icon name="alert" size={18} />
          <p><strong>{row.name}:</strong> Completa el costo del premio para calcular tu retorno.</p>
          <button type="button" className="secondary-button" onClick={() => navigate(`/panel/tarjetas/${row.programId}/editar?paso=3`)}>Editar tarjeta</button>
        </div>
      ))}

      {data.byProgram.length > 0 && <ProgramsTable rows={data.byProgram} />}
      {loading && <p className="metrics-loading-note" role="status">Actualizando rentabilidad…</p>}
    </section>
  );
}

ProfitabilityPanel.propTypes = {
  range: PropTypes.string.isRequired,
  from: PropTypes.string.isRequired,
  to: PropTypes.string.isRequired,
  branchId: PropTypes.string
};
