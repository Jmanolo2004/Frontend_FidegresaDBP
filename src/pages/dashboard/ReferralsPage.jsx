import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import { PageHeader } from "../../components/common/PageHeader";
import { PanelHeading } from "../../components/common/PanelHeading";
import { FilterSelect } from "../../components/common/FilterSelect";
import { Pagination } from "../../components/common/Pagination";
import { StatusPill } from "../../components/common/StatusPill";
import { Switch } from "../../components/common/Switch";
import { Skeleton, TableSkeleton } from "../../components/common/Skeleton";
import { ErrorState } from "../../components/common/ErrorState";
import { Icon } from "../../components/common/Icon";
import { useFetch } from "../../hooks/useFetch";
import { useToast } from "../../hooks/useToast";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { referralService } from "../../services/referralService";
import { toApiError } from "../../api/apiErrors";
import { formatDate } from "../../utils/format";
import "../../styles/referrals.css";

const STATUS_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "PENDING", label: "Pendientes" },
  { value: "REWARDED", label: "Premiados" },
  { value: "LIMIT_REACHED", label: "Tope del mes" }
];
const PILL = { PENDING: "pending", REWARDED: "active", LIMIT_REACHED: "inactive" };
// Puestos del ranking de embajadoras (el backend cuenta todas las invitaciones).
const RANKING_SIZE = 5;

function Change({ current, previous }) {
  if (previous == null) return null;
  const diff = Number(current || 0) - Number(previous || 0);
  if (diff === 0) return <small className="rf-change">Igual que el mes anterior</small>;
  return <small className={`rf-change ${diff > 0 ? "up" : "down"}`}>{diff > 0 ? "+" : ""}{diff} vs. mes anterior</small>;
}

Change.propTypes = { current: PropTypes.number, previous: PropTypes.number };

function SettingsRow({ item, onSaved }) {
  const { showToast } = useToast();
  const field = item.programType === "Estampillas" ? "rewardStamps" : item.programType === "Cashback" ? "rewardCashback" : "rewardPoints";
  const [value, setValue] = useState(String(item[field]));
  const [enabled, setEnabled] = useState(item.enabled);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const changed = enabled !== item.enabled || Number(value) !== Number(item[field]);

  useEffect(() => {
    setValue(String(item[field]));
    setEnabled(item.enabled);
  }, [item, field]);

  const save = async () => {
    const number = Number(value);
    if (field === "rewardStamps" && !(Number.isInteger(number) && number >= 1 && number <= 10)) return setError("De 1 a 10 sellos.");
    if (field === "rewardCashback" && !(number >= 0.5 && number <= 100)) return setError("Entre S/ 0.50 y S/ 100.");
    if (field === "rewardPoints" && !(Number.isInteger(number) && number >= 1 && number <= 10000)) return setError("De 1 a 10 000 puntos.");
    setError("");
    setSaving(true);
    try {
      const saved = await referralService.saveSettings(item.programId, { enabled, [field]: number });
      onSaved(saved);
      showToast(saved.enabled ? `Premio guardado: ${saved.reward} para cada uno.` : "Referidos desactivados en esta tarjeta.");
    } catch (failure) {
      setError(toApiError(failure).message);
    } finally {
      setSaving(false);
    }
  };

  const unit = field === "rewardStamps" ? "sellos" : field === "rewardCashback" ? "soles de cashback" : "puntos";
  return (
    <li className="rf-setting">
      <div className="rf-setting-name">
        <strong>{item.programName}</strong>
        <span>{item.programType}</span>
      </div>
      <label className="rf-setting-value">
        <span className="sr-only">Premio en {unit} para {item.programName}</span>
        <input className="form-control" type="number" min={field === "rewardCashback" ? 0.5 : 1} step={field === "rewardCashback" ? 0.5 : 1} value={value} disabled={!enabled} onChange={event => setValue(event.target.value)} />
        <small>{unit}</small>
      </label>
      <Switch checked={enabled} onChange={setEnabled} label={`Referidos en ${item.programName}`} />
      <button type="button" className="secondary-button" onClick={save} disabled={!changed || saving}>{saving ? "Guardando…" : "Guardar"}</button>
      {error && <p className="rf-error" role="alert">{error}</p>}
    </li>
  );
}

SettingsRow.propTypes = { item: PropTypes.object.isRequired, onSaved: PropTypes.func.isRequired };

export default function ReferralsPage() {
  useDocumentTitle("Referidos");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const stats = useFetch(({ signal }) => referralService.getStats({}, { signal }), []);
  const list = useFetch(({ signal }) => referralService.getPage({ status, page, size }, { signal }), [status, page, size]);
  const recent = useFetch(({ signal }) => referralService.getRanking({ limit: RANKING_SIZE }, { signal }), []);
  const settings = useFetch(({ signal }) => referralService.getSettings({ signal }), []);

  const totals = stats.data?.totals;
  const previous = stats.data?.previous;
  const ranking = recent.data ?? null;
  const activePrograms = settings.data?.filter(item => item.enabled).length ?? 0;

  return (
    <>
      <PageHeader
        title="Referidos"
        summary="Tus clientes invitan a sus amigas con su enlace. Cuando la amiga hace su primera visita o compra, las dos reciben un premio."
      />

      {stats.error ? (
        <ErrorState error={stats.error} onRetry={stats.reload} compact />
      ) : (
        <div className="rf-stats" aria-busy={!totals}>
          {!totals ? (
            [0, 1, 2, 3].map(index => <Skeleton key={index} height={92} radius={12} />)
          ) : (
            <>
              <div className="panel"><span>Abrieron un enlace</span><strong>{totals.linkOpens}</strong><Change current={totals.linkOpens} previous={previous?.linkOpens} /></div>
              <div className="panel"><span>Se registraron</span><strong>{totals.signups}</strong><Change current={totals.signups} previous={previous?.signups} /></div>
              <div className="panel"><span>Ya vinieron</span><strong>{totals.converted}</strong><small className="rf-change">{Number(stats.data.conversionRate).toLocaleString("es-PE")} de cada 100 registrados</small></div>
              <div className="panel"><span>Premios entregados</span><strong>{totals.rewards}</strong><Change current={totals.rewards} previous={previous?.rewards} /></div>
            </>
          )}
        </div>
      )}

      <div className="rf-grid">
        <article className="panel rf-ranking">
          <PanelHeading title="Tus embajadoras" subtitle="Clientes que más amigas trajeron" />
          {recent.error ? (
            <p className="rf-error">{toApiError(recent.error).message}</p>
          ) : !ranking ? (
            <Skeleton height={180} />
          ) : ranking.length === 0 ? (
            <p className="rf-empty">Aún nadie invitó a una amiga. Cuando lo hagan, aquí verás quién trae más clientes.</p>
          ) : (
            <ol className="rf-ranking-list">
              {ranking.map((person, index) => (
                <li key={person.id}>
                  <span className={`rf-place place-${index + 1}`} aria-label={`Puesto ${index + 1}`}>{index + 1}</span>
                  <Link className="customer-link" to={`/panel/clientes/${person.id}`}>{person.name}</Link>
                  <span className="rf-ranking-count">
                    <strong>{person.converted}</strong> {person.converted === 1 ? "amiga vino" : "amigas vinieron"}
                    {person.invited > person.converted && <small>, {person.invited - person.converted} por venir</small>}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </article>

        <article className="panel rf-settings">
          <PanelHeading title="Premio por invitar" subtitle={settings.data ? `${activePrograms} de ${settings.data.length} tarjetas con referidos activos. El premio es para las dos personas.` : "Lo que reciben quien invita y su amiga"} />
          {settings.error ? (
            <p className="rf-error">{toApiError(settings.error).message}</p>
          ) : !settings.data ? (
            <Skeleton height={180} />
          ) : settings.data.length === 0 ? (
            <p className="rf-empty">Crea una tarjeta de estampillas, cashback o niveles para activar los referidos. Las gift cards no tienen premio por referido.</p>
          ) : (
            <ul className="rf-settings-list">
              {settings.data.map(item => (
                <SettingsRow key={item.programId} item={item} onSaved={saved => settings.setData(previous => previous.map(row => (row.programId === saved.programId ? saved : row)))} />
              ))}
            </ul>
          )}
        </article>
      </div>

      <article className="panel activity-panel">
        <PanelHeading title="Invitaciones" subtitle="Quién invitó a quién y si ya recibieron su premio">
          <FilterSelect value={status} onChange={value => { setStatus(value); setPage(0); }} options={STATUS_OPTIONS} label="Filtrar por estado" />
        </PanelHeading>
        {list.error ? (
          <ErrorState error={list.error} onRetry={list.reload} compact />
        ) : !list.data ? (
          <TableSkeleton rows={5} />
        ) : list.data.content.length === 0 ? (
          <p className="rf-empty">{status ? "No hay invitaciones con este estado." : "Todavía no hay invitaciones. Tus clientes encuentran su enlace al unirse desde el menú."}</p>
        ) : (
          <div className={list.loading ? "is-refreshing" : ""}>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th>Invitó</th><th>Amiga</th><th>Tarjeta</th><th>Fecha</th><th>Estado</th></tr>
                </thead>
                <tbody>
                  {list.data.content.map(item => (
                    <tr key={item.id}>
                      <td><Link className="customer-link" to={`/panel/clientes/${item.referrerId}`}>{item.referrerName}</Link></td>
                      <td><Link className="customer-link" to={`/panel/clientes/${item.referredId}`}>{item.referredName}</Link></td>
                      <td>{item.programName}</td>
                      <td>{formatDate(item.createdAt)}</td>
                      <td><StatusPill variant={PILL[item.status] || "pending"}>{item.statusLabel}</StatusPill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={list.data.number} totalPages={list.data.totalPages} totalElements={list.data.totalElements} size={list.data.size} onPageChange={setPage} onSizeChange={value => { setSize(value); setPage(0); }} itemLabel="invitaciones" />
          </div>
        )}
      </article>
      <p className="rf-footnote"><Icon name="link" size={14} /> Tus clientes reciben su enlace para invitar al unirse desde el menú con QR.</p>
    </>
  );
}
