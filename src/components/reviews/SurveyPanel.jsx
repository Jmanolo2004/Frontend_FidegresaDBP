import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Icon } from "../common/Icon";
import { Modal } from "../common/Modal";
import { FormField } from "../common/FormField";
import { Switch } from "../common/Switch";
import { Skeleton } from "../common/Skeleton";
import { useFetch } from "../../hooks/useFetch";
import { useToast } from "../../hooks/useToast";
import { surveyService } from "../../services/surveyService";
import { toApiError } from "../../api/apiErrors";

const percent = value => `${Number(value || 0).toLocaleString("es-PE", { maximumFractionDigits: 1 })} %`;
const stars = value => (Number(value) ? Number(value).toLocaleString("es-PE", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "—");

/** Diferencia con el periodo anterior, solo si hay con qué comparar. */
function Change({ current, previous, suffix = "" }) {
  if (!previous) return null;
  const diff = Number(current || 0) - Number(previous || 0);
  if (Math.abs(diff) < 0.05) return <small className="survey-change">Igual que el mes anterior</small>;
  const text = `${diff > 0 ? "+" : ""}${diff.toLocaleString("es-PE", { maximumFractionDigits: 1 })}${suffix}`;
  return <small className={`survey-change ${diff > 0 ? "up" : "down"}`}>{text} vs. mes anterior</small>;
}

Change.propTypes = { current: PropTypes.number, previous: PropTypes.number, suffix: PropTypes.string };

/** Encuesta de satisfacción después de la visita: resultados del mes y configuración. */
export function SurveyPanel({ branchId }) {
  const { showToast } = useToast();
  const settings = useFetch(({ signal }) => surveyService.getSettings({ signal }), []);
  const metrics = useFetch(({ signal }) => surveyService.getMetrics({ branchId }, { signal }), [branchId]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ enabled: true, question: "", cooldownDays: 14 });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing && settings.data) {
      setForm({ enabled: settings.data.enabled, question: settings.data.question, cooldownDays: settings.data.cooldownDays });
      setFormError("");
    }
  }, [editing, settings.data]);

  const save = async () => {
    const question = form.question.trim();
    const days = Number(form.cooldownDays);
    if (!question) return setFormError("Escribe la pregunta de la encuesta.");
    if (question.length > 120) return setFormError("La pregunta puede tener hasta 120 caracteres.");
    if (!Number.isInteger(days) || days < 1 || days > 60) return setFormError("Los días entre encuestas deben estar entre 1 y 60.");
    setSaving(true);
    try {
      settings.setData(await surveyService.saveSettings({ enabled: form.enabled, question, cooldownDays: days }));
      setEditing(false);
      showToast(form.enabled ? "Encuesta guardada." : "Encuesta desactivada.");
    } catch (error) {
      setFormError(toApiError(error).message);
    } finally {
      setSaving(false);
    }
  };

  const config = settings.data;
  const data = metrics.data;
  const totals = data?.totals;
  const previous = data?.previous;
  const channels = config ? [config.walletReady && "Google Wallet", config.emailReady && "correo"].filter(Boolean) : [];

  return (
    <article className="panel survey-panel" aria-labelledby="survey-title">
      <div className="survey-head">
        <div>
          <h2 id="survey-title">Encuesta de satisfacción</h2>
          <p>
            {config
              ? config.enabled
                ? `Después de cada visita preguntamos: “${config.question}”`
                : "La encuesta está desactivada: tus clientes no la reciben."
              : "Tus clientes califican su visita con estrellas y un comentario."}
          </p>
          {config?.enabled && (
            <p className="survey-channel">
              {channels.length ? `Se envía por ${channels.join(" y ")}, como máximo una vez cada ${config.cooldownDays} días por cliente.` : "Para enviarla falta configurar el enlace público de la web (PUBLIC_WEB_URL) en el backend."}
            </p>
          )}
        </div>
        <button type="button" className="secondary-button" onClick={() => setEditing(true)} disabled={!config}>
          <Icon name="settings" size={16} />
          Configurar
        </button>
      </div>

      {metrics.error && !data ? (
        <p className="ai-summary-error" role="alert">{toApiError(metrics.error).message}</p>
      ) : !totals ? (
        <div className="survey-stats">{[0, 1, 2, 3].map(index => <Skeleton key={index} height={74} radius={10} />)}</div>
      ) : (
        <>
          <div className="survey-stats">
            <div><span>Enviadas este mes</span><strong>{totals.sent}</strong><Change current={totals.sent} previous={previous?.sent} /></div>
            <div><span>Respondidas</span><strong>{totals.answered}</strong><Change current={totals.answered} previous={previous?.answered} /></div>
            <div><span>Tasa de respuesta</span><strong>{percent(totals.responseRate)}</strong><Change current={Number(totals.responseRate)} previous={Number(previous?.responseRate)} suffix=" pts" /></div>
            <div><span>Calificación promedio</span><strong>{stars(totals.averageRating)} <small>de 5</small></strong><Change current={Number(totals.averageRating)} previous={Number(previous?.averageRating)} /></div>
          </div>
          {!branchId && data.byBranch.length > 1 && (
            <table className="survey-table">
              <thead><tr><th>Local</th><th>Enviadas</th><th>Respondidas</th><th>Tasa</th><th>Promedio</th></tr></thead>
              <tbody>
                {data.byBranch.map(row => (
                  <tr key={row.branchId}>
                    <td>{row.branchName}</td>
                    <td>{row.sent}</td>
                    <td>{row.answered}</td>
                    <td>{percent(row.responseRate)}</td>
                    <td>{stars(row.averageRating)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      <Modal open={editing} title="Encuesta de satisfacción" subtitle="Se envía después de una visita registrada en caja." onClose={() => setEditing(false)} onSubmit={save} submitting={saving}>
        <div className="survey-form">
          <div className="survey-switch">
            <div>
              <strong>Enviar la encuesta</strong>
              <small>Si la apagas, tus clientes dejan de recibirla.</small>
            </div>
            <Switch checked={form.enabled} onChange={value => setForm(previous => ({ ...previous, enabled: value }))} label="Enviar la encuesta" />
          </div>
          <FormField label="Pregunta" hint="Hasta 120 caracteres." full>
            <input className="form-control" maxLength={120} value={form.question} onChange={event => setForm(previous => ({ ...previous, question: event.target.value }))} />
          </FormField>
          <FormField label="Días mínimos entre encuestas a un mismo cliente" hint="Entre 1 y 60, para no cansar a tus clientes." full>
            <input className="form-control" type="number" min={1} max={60} value={form.cooldownDays} onChange={event => setForm(previous => ({ ...previous, cooldownDays: event.target.value }))} />
          </FormField>
          {formError && <p className="ai-summary-error" role="alert">{formError}</p>}
        </div>
      </Modal>
    </article>
  );
}

SurveyPanel.propTypes = { branchId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]) };
