import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBlocker, useLoaderData, useNavigate, useSearchParams } from "react-router-dom";
import PropTypes from "prop-types";
import { AddressSearch } from "../../components/map/AddressSearch";
import { GeoMap } from "../../components/map/GeoMap";
import { LimaMap } from "../../components/geo/LimaMap";
import { Avatar } from "../../components/common/Avatar";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { FormField } from "../../components/common/FormField";
import { Icon } from "../../components/common/Icon";
import { PageHeader } from "../../components/common/PageHeader";
import { Skeleton } from "../../components/common/Skeleton";
import { audienceService } from "../../services/audienceService";
import { branchService } from "../../services/branchService";
import { geoService } from "../../services/geoService";
import { useDebounce } from "../../hooks/useDebounce";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useFetch } from "../../hooks/useFetch";
import { useForm } from "../../hooks/useForm";
import { useToast } from "../../hooks/useToast";
import { formatDistance } from "../../utils/mapUtils";
import { required, maxLength } from "../../utils/validators";

const STEPS = ["Zona", "Segmento", "Mensaje", "Disparo", "Revisión"];
const DISTRICTS = ["Barranco", "Miraflores", "San Isidro", "San Borja", "Santiago de Surco"];
const CARD_TYPES = ["Estampillas", "Cashback", "Niveles", "Giftcard"];
const WEEK_DAYS = [
  ["lun", "L"], ["mar", "M"], ["mie", "X"], ["jue", "J"], ["vie", "V"], ["sab", "S"], ["dom", "D"]
];
const FIELD_RULES = {
  nombre: [required("Escribe un nombre para la audiencia."), maxLength(60, "Usa hasta 60 caracteres.")],
  title: [required("Escribe el título de la notificación."), maxLength(40, "Usa hasta 40 caracteres.")],
  text: [required("Escribe el mensaje de la notificación."), maxLength(140, "Usa hasta 140 caracteres.")]
};

function getBranch(branches, id) {
  return branches.find(item => Number(item.id) === Number(id)) || branches[0];
}

function initialValues(audience, params, branches) {
  const branch = getBranch(branches, audience?.branchId || params.get("branchId"));
  const center = audience?.center || { lat: Number(params.get("lat")) || Number(branch?.latitud), lng: Number(params.get("lng")) || Number(branch?.longitud) };
  return {
    nombre: audience?.nombre || "",
    branchId: Number(branch?.id) || "",
    latitud: Number(audience?.latitud ?? center.lat) || 0,
    longitud: Number(audience?.longitud ?? center.lng) || 0,
    zoneType: audience?.zoneType || "radius",
    district: audience?.district || branch?.distrito || "Miraflores",
    radius: Number(audience?.radius || params.get("radius")) || 500,
    activity: audience?.filters?.activity || "todos",
    cardType: audience?.filters?.cardType || ({ stamps: "Estampillas", cashback: "Cashback", tiers: "Niveles", giftcard: "Giftcard" }[params.get("program")] || "Todas"),
    closeToReward: audience?.filters?.closeToReward ?? params.get("closeToReward") === "true",
    minimumVisits: audience?.filters?.minimumVisits || "",
    birthdayThisMonth: Boolean(audience?.filters?.birthdayThisMonth),
    title: audience?.message?.title || audience?.titulo || "",
    text: audience?.message?.text || audience?.mensaje || "",
    action: audience?.message?.action || "",
    trigger: audience?.trigger || "geofence",
    scheduleDate: audience?.schedule?.date || "",
    scheduleTime: audience?.schedule?.time || "10:00",
    startDate: audience?.schedule?.startDate || new Date().toISOString().slice(0, 10),
    endDate: audience?.schedule?.endDate || "",
    startHour: audience?.schedule?.startHour || "08:00",
    endHour: audience?.schedule?.endHour || "21:00",
    days: audience?.schedule?.days || ["lun", "mar", "mie", "jue", "vie", "sab", "dom"],
    frequencyDays: audience?.schedule?.frequencyDays || 7
  };
}

function NotificationPreview({ title, message, action }) {
  const substitute = value => String(value || "").replaceAll("{nombre}", "María").replaceAll("{local}", "Café de la Plaza").replaceAll("{premio}", "un beneficio especial");
  return (
    <div className="notification-phone" aria-label="Vista previa de la notificación en el celular del cliente">
      <div className="notification-phone-screen">
        <div className="notification-phone-status"><span>9:41</span><span>◉ ◉ ◉</span></div>
        <div className="notification-lock-time">9:41</div>
        <div className="notification-card">
          <div className="notification-card-heading"><span className="notification-brand-dot">F</span><b>FIDEGRESA</b><time>ahora</time></div>
          <strong>{substitute(title) || "Tu próxima visita tiene premio"}</strong>
          <p>{substitute(message) || "Acércate y descubre un beneficio preparado para ti."}</p>
          {action && <span className="notification-action">{action}</span>}
        </div>
        <small>Desliza hacia arriba para abrir</small>
      </div>
      <span className="notification-platform">Vista ilustrativa · iOS / Android</span>
    </div>
  );
}

NotificationPreview.propTypes = { title: PropTypes.string, message: PropTypes.string, action: PropTypes.string };

function WizardMapFallback({ branch, radius, customers, onMove, onMoveEnd }) {
  return (
    <div className="geo-map-fallback">
      <p role="status">No se pudo cargar el mapa en línea. El área ilustrativa conserva la zona y los clientes.</p>
      <LimaMap location={{ ...branch, mapX: Number(branch.mapX) || 410, mapY: Number(branch.mapY) || 325 }} customers={customers} radius={radius} onMove={onMove} onMoveEnd={onMoveEnd} onCenter={() => onMoveEnd({ x: Number(branch.mapX) || 410, y: Number(branch.mapY) || 325 })} />
    </div>
  );
}

WizardMapFallback.propTypes = { branch: PropTypes.object.isRequired, radius: PropTypes.number.isRequired, customers: PropTypes.array.isRequired, onMove: PropTypes.func.isRequired, onMoveEnd: PropTypes.func.isRequired };

function AudienceWizardForm({ audience }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast, showError } = useToast();
  const branchesFetch = useCallback(({ signal }) => branchService.getAll({ signal }), []);
  const { data: branches } = useFetch(branchesFetch, []);
  const branchList = branches || [];
  const formInitial = useMemo(() => initialValues(audience, searchParams, branchList), [audience, searchParams, branchList]);
  const mode = useRef("Activa");
  const saved = useRef(false);
  const initialized = useRef(false);
  const [step, setStep] = useState(0);
  const [preview, setPreview] = useState(null);
  const form = useForm({
    initialValues: formInitial,
    rules: FIELD_RULES,
    onSubmit: async values => {
      const payload = {
        nombre: values.nombre.trim(),
        branchId: Number(values.branchId),
        latitud: Number(values.latitud),
        longitud: Number(values.longitud),
        radius: Number(values.radius),
        zoneType: values.zoneType,
        district: values.district,
        filters: {
          activity: values.activity,
          cardType: values.cardType,
          closeToReward: values.closeToReward,
          minimumVisits: Number(values.minimumVisits) || 0,
          birthdayThisMonth: values.birthdayThisMonth
        },
        message: { title: values.title.trim(), text: values.text.trim(), action: values.action },
        trigger: values.trigger,
        schedule: {
          date: values.scheduleDate,
          time: values.scheduleTime,
          startDate: values.startDate,
          endDate: values.endDate,
          startHour: values.startHour,
          endHour: values.endHour,
          days: values.days,
          frequencyDays: Number(values.frequencyDays)
        },
        estado: mode.current === "test" ? audience?.estado || "Borrador" : mode.current
      };
      try {
        const savedAudience = audience
          ? await audienceService.update(audience.id, payload)
          : await audienceService.create(payload);
        saved.current = true;
        if (mode.current === "test") {
          const result = await audienceService.sendTest(savedAudience.id);
          showToast(`Notificación de prueba enviada a ${result.destinatario}.`);
        } else {
          showToast(mode.current === "Borrador" ? "Borrador guardado." : mode.current === "Programada" ? "Audiencia programada." : "Audiencia activada.");
        }
        navigate(`/panel/geolocalizacion/audiencias/${savedAudience.id}`);
      } catch (error) {
        showError(error.message);
      }
    }
  });
  useEffect(() => {
    if (branches && !initialized.current) {
      form.reset(formInitial);
      initialized.current = true;
    }
  }, [branches, formInitial, form.reset]);
  const [mobileMapOpen, setMobileMapOpen] = useState(true);
  const dirty = JSON.stringify(form.values) !== JSON.stringify(formInitial);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && !saved.current && currentLocation.pathname !== nextLocation.pathname);
  const previewRequest = useMemo(() => ({
    branchId: Number(form.values.branchId),
    latitud: Number(form.values.latitud),
    longitud: Number(form.values.longitud),
    radius: Number(form.values.radius),
    zoneType: form.values.zoneType,
    district: form.values.district,
    activity: form.values.activity,
    cardType: form.values.cardType,
    closeToReward: form.values.closeToReward,
    minimumVisits: Number(form.values.minimumVisits) || 0,
    birthdayThisMonth: form.values.birthdayThisMonth
  }), [form.values]);
  const debouncedPreview = useDebounce(previewRequest, 300);
  const currentBranch = getBranch(branchList, form.values.branchId);
  const customerFetch = useCallback(({ signal }) => form.values.branchId ? geoService.getCustomers({ branchId: form.values.branchId }, { signal }) : Promise.resolve([]), [form.values.branchId]);
  const { data: branchCustomers } = useFetch(customerFetch, [form.values.branchId], { enabled: Boolean(form.values.branchId) });

  useEffect(() => {
    if (!debouncedPreview.branchId) return undefined;
    const controller = new AbortController();
    audienceService.preview(debouncedPreview, { signal: controller.signal }).then(setPreview).catch(error => {
      if (error.name !== "CanceledError" && error.code !== "ERR_CANCELED") showError(error.message);
    });
    return () => controller.abort();
  }, [debouncedPreview, showError]);

  useEffect(() => {
    const beforeUnload = event => {
      if (!dirty || saved.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  const setField = (name, value) => form.setFieldValue(name, value);
  const validateStep = () => {
    const values = form.values;
    const errors = {};
    if (step === 0) {
      if (!values.branchId) errors.branchId = "Selecciona un local.";
      if (!Number.isFinite(Number(values.radius)) || values.radius < 100 || values.radius > 3000) errors.radius = "El radio debe estar entre 100 m y 3 km.";
      if (values.zoneType === "district" && !DISTRICTS.includes(values.district)) errors.district = "Selecciona un distrito.";
    }
    if (step === 1 && values.minimumVisits && Number(values.minimumVisits) < 0) errors.minimumVisits = "Las visitas mínimas no pueden ser negativas.";
    if (step === 2) {
      if (!values.title.trim()) errors.title = "Escribe el título de la notificación.";
      if (values.title.length > 40) errors.title = "Usa hasta 40 caracteres.";
      if (!values.text.trim()) errors.text = "Escribe el mensaje de la notificación.";
      if (values.text.length > 140) errors.text = "Usa hasta 140 caracteres.";
    }
    if (step === 3) {
      if (!values.startHour || !values.endHour || values.startHour >= values.endHour) errors.startHour = "Define un horario permitido válido.";
      if (!values.days.length) errors.days = "Selecciona al menos un día de la semana.";
      if (values.trigger === "scheduled" && (!values.scheduleDate || !values.scheduleTime)) errors.scheduleDate = "Selecciona la fecha y hora del envío.";
      if (values.endDate && values.endDate < values.startDate) errors.endDate = "La fecha final debe ser posterior al inicio.";
      if (values.trigger === "scheduled" && values.scheduleDate && new Date(`${values.scheduleDate}T${values.scheduleTime}`) < new Date()) errors.scheduleDate = "El envío debe programarse para una fecha futura.";
    }
    if (step === 4 && !values.nombre.trim()) errors.nombre = "Escribe un nombre para la audiencia.";
    form.setErrors(errors);
    const firstInvalid = Object.keys(errors)[0];
    if (firstInvalid) document.querySelector(`[name="${firstInvalid}"]`)?.focus();
    return Object.keys(errors).length === 0;
  };
  const goNext = () => {
    if (validateStep()) setStep(value => Math.min(STEPS.length - 1, value + 1));
  };
  const submit = selectedMode => {
    if (!validateStep()) return;
    mode.current = selectedMode;
    form.handleSubmit();
  };
  const handleSubmit = event => {
    event.preventDefault();
    if (step < STEPS.length - 1) goNext();
    else submit(form.values.trigger === "scheduled" ? "Programada" : "Activa");
  };
  const selectedBranch = currentBranch ? { ...currentBranch, latitud: Number(form.values.latitud), longitud: Number(form.values.longitud) } : null;
  const legacyCustomers = (branchCustomers || []).map(person => ({ ...person, distance: Number(person.distance) || 0 }));
  const legacyUpdate = point => {
    const position = coordinatesFromMap(currentBranch?.distrito, point.x, point.y);
    setField("latitud", position.latitud);
    setField("longitud", position.longitud);
  };
  const closeBlocker = () => blocker.reset?.();
  const leave = () => blocker.proceed?.();
  const estimatedCount = preview?.total ?? 0;

  useDocumentTitle(audience ? "Editar audiencia" : "Crear audiencia");
  if (!branches) return <><PageHeader title={audience ? "Editar audiencia" : "Crear audiencia"} /><Skeleton height={520} /></>;

  return (
    <>
      <PageHeader title={audience ? "Editar audiencia" : "Crear audiencia"} summary="Configura zona, segmento y notificación para tus clientes." />
      <div className="audience-wizard-layout">
        <section className="panel audience-wizard-form">
          <ol className="audience-wizard-steps" aria-label="Pasos para configurar la audiencia">
            {STEPS.map((item, index) => <li key={item} className={index === step ? "current" : index < step ? "complete" : ""}><button type="button" aria-current={index === step ? "step" : undefined} disabled={index > step} onClick={() => index < step && setStep(index)}><span>{index < step ? "✓" : index + 1}</span><small>{item}</small></button></li>)}
          </ol>
          <form onSubmit={handleSubmit} noValidate>
            <div className="audience-step-content">
              <p className="card-wizard-step-count">PASO {step + 1} DE {STEPS.length}</p>
              <h2>{["Define la zona", "Elige a quién avisar", "Escribe la notificación", "Configura el disparo", "Revisa y activa"][step]}</h2>
              {step === 0 && (
                <div className="form-grid">
                  <FormField label="Local" error={form.errors.branchId}>
                    <select className="form-control" name="branchId" value={form.values.branchId} onChange={event => {
                      const branch = getBranch(branchList, event.target.value);
                      setField("branchId", Number(event.target.value));
                      if (branch) { setField("latitud", Number(branch.latitud)); setField("longitud", Number(branch.longitud)); setField("district", branch.distrito); }
                    }}>{branchList.map(branch => <option key={branch.id} value={branch.id}>{branch.nombre} · {branch.distrito}</option>)}</select>
                  </FormField>
                  <FormField label="Nombre de la audiencia" error={form.errors.nombre}>
                    <input maxLength="60" placeholder="Ej. Clientes cerca del local" {...form.getFieldProps("nombre")} />
                  </FormField>
                  <div className="audience-zone-type" role="radiogroup" aria-label="Tipo de zona">
                    <label><input type="radio" name="zoneType" checked={form.values.zoneType === "radius"} onChange={() => setField("zoneType", "radius")} /> Radio alrededor del local</label>
                    <label><input type="radio" name="zoneType" checked={form.values.zoneType === "district"} onChange={() => setField("zoneType", "district")} /> Zona por distrito</label>
                  </div>
                  {form.values.zoneType === "radius" ? <div className="audience-radius-field"><div className="range-value"><strong>{form.values.radius} m</strong><span>100 m – 3 km</span></div><FormField label="Radio de alcance" error={form.errors.radius}><input name="radius" type="range" min="100" max="3000" step="50" value={form.values.radius} onChange={event => setField("radius", Number(event.target.value))} aria-label="Radio de alcance en metros" /></FormField><div className="geo-radius-presets">{[300, 500, 1000, 2000].map(radius => <button key={radius} className={Number(form.values.radius) === radius ? "selected" : ""} type="button" onClick={() => setField("radius", radius)}>{radius >= 1000 ? `${radius / 1000} km` : `${radius} m`}</button>)}</div></div> : (
                    <FormField label="Distrito" error={form.errors.district}><select className="form-control" name="district" value={form.values.district} onChange={event => setField("district", event.target.value)}>{DISTRICTS.map(district => <option key={district}>{district}</option>)}</select></FormField>
                  )}
                  <AddressSearch onSelect={position => { setField("latitud", position.lat); setField("longitud", position.lng); }} />
                </div>
              )}
              {step === 1 && (
                <div className="form-grid">
                  <FormField label="Actividad">
                    <select className="form-control" value={form.values.activity} onChange={event => setField("activity", event.target.value)}><option value="todos">Todos los clientes</option><option value="activos">Activos (visita en 30 días)</option><option value="inactivos30">Inactivos hace más de 30 días</option><option value="inactivos60">Inactivos hace más de 60 días</option><option value="inactivos90">Inactivos hace más de 90 días</option></select>
                  </FormField>
                  <FormField label="Tipo de tarjeta"><select className="form-control" value={form.values.cardType} onChange={event => setField("cardType", event.target.value)}><option>Todas</option>{CARD_TYPES.map(type => <option key={type}>{type}</option>)}</select></FormField>
                  <FormField label="Visitas mínimas" error={form.errors.minimumVisits}><input type="number" min="0" name="minimumVisits" value={form.values.minimumVisits} onChange={event => setField("minimumVisits", event.target.value)} placeholder="Sin mínimo" /></FormField>
                  <label className="audience-check"><input type="checkbox" checked={form.values.closeToReward} onChange={event => setField("closeToReward", event.target.checked)} /> A 1 o 2 sellos del premio</label>
                  <label className="audience-check"><input type="checkbox" checked={form.values.birthdayThisMonth} onChange={event => setField("birthdayThisMonth", event.target.checked)} /> Cumpleaños este mes</label>
                  <div className="audience-preview-count"><strong>{preview?.total ?? "—"}</strong><span>personas incluidas</span><small>{preview?.excluidosSinConsentimiento ?? 0} excluidas por no tener consentimiento o avisos activos</small></div>
                </div>
              )}
              {step === 2 && (
                <div className="form-grid">
                  <FormField label="Título" error={form.errors.title} hint={`${form.values.title.length}/40 caracteres`}><input maxLength="40" placeholder="Ej. ¡Te esperamos por el local!" {...form.getFieldProps("title")} /></FormField>
                  <FormField label="Mensaje" error={form.errors.text} hint={`${form.values.text.length}/140 caracteres`} full><textarea rows="4" maxLength="140" placeholder="Hola {nombre}, pasa por {local} y descubre {premio}." {...form.getFieldProps("text")} /></FormField>
                  <FormField label="Botón de acción" optional><select className="form-control" value={form.values.action} onChange={event => setField("action", event.target.value)}><option value="">Sin botón</option><option>Ver mi tarjeta</option><option>Cómo llegar</option></select></FormField>
                  <div className="audience-variable-help"><strong>Variables disponibles</strong><span>{"{nombre}"} · {"{local}"} · {"{premio}"}</span></div>
                </div>
              )}
              {step === 3 && (
                <div className="form-grid">
                  <div className="audience-trigger-choice" role="radiogroup" aria-label="Cuándo enviar la notificación">
                    <label><input type="radio" name="trigger" checked={form.values.trigger === "geofence"} onChange={() => setField("trigger", "geofence")} /><span><b>Al entrar a la zona</b><small>La app móvil del cliente detecta la entrada a la geocerca.</small></span></label>
                    <label><input type="radio" name="trigger" checked={form.values.trigger === "scheduled"} onChange={() => setField("trigger", "scheduled")} /><span><b>Envío programado</b><small>Programa un envío para una fecha y hora específicas.</small></span></label>
                  </div>
                  {form.values.trigger === "scheduled" && <><FormField label="Fecha de envío" error={form.errors.scheduleDate}><input type="date" name="scheduleDate" value={form.values.scheduleDate} onChange={event => setField("scheduleDate", event.target.value)} /></FormField><FormField label="Hora de envío"><input type="time" value={form.values.scheduleTime} onChange={event => setField("scheduleTime", event.target.value)} /></FormField></>}
                  <div className="audience-field-group"><strong>Horario permitido</strong><div><FormField label="Desde" error={form.errors.startHour}><input type="time" name="startHour" value={form.values.startHour} onChange={event => setField("startHour", event.target.value)} /></FormField><FormField label="Hasta"><input type="time" value={form.values.endHour} onChange={event => setField("endHour", event.target.value)} /></FormField></div></div>
                  {form.errors.startHour && <p className="field-error" role="alert">{form.errors.startHour}</p>}
                  <div className="audience-weekdays" role="group" aria-label="Días permitidos">{WEEK_DAYS.map(([day, label]) => <label key={day} className={form.values.days.includes(day) ? "selected" : ""}><input type="checkbox" checked={form.values.days.includes(day)} onChange={event => setField("days", event.target.checked ? [...form.values.days, day] : form.values.days.filter(item => item !== day))} /><span>{label}</span></label>)}</div>
                  {form.errors.days && <p className="field-error" role="alert">{form.errors.days}</p>}
                  <FormField label="Frecuencia por cliente"><select className="form-control" value={form.values.frequencyDays} onChange={event => setField("frequencyDays", Number(event.target.value))}>{[1, 3, 7, 14, 30].map(days => <option value={days} key={days}>Máximo 1 aviso cada {days} días</option>)}</select></FormField>
                  <FormField label="Vigencia desde"><input type="date" value={form.values.startDate} onChange={event => setField("startDate", event.target.value)} /></FormField>
                  <FormField label="Vigencia hasta" error={form.errors.endDate}><input type="date" name="endDate" value={form.values.endDate} onChange={event => setField("endDate", event.target.value)} /></FormField>
                </div>
              )}
              {step === 4 && (
                <div className="form-grid">
                  <FormField label="Nombre de la audiencia" error={form.errors.nombre}><input maxLength="60" placeholder="Ej. Clientes cerca del local" {...form.getFieldProps("nombre")} /></FormField>
                  <dl className="audience-review">
                    <div><dt>Zona</dt><dd>{form.values.zoneType === "district" ? form.values.district : `${form.values.radius} m alrededor de ${currentBranch?.nombre}`}</dd></div>
                    <div><dt>Personas alcanzables</dt><dd>{estimatedCount} (excluye {preview?.excluidosSinConsentimiento || 0} sin consentimiento)</dd></div>
                    <div><dt>Disparo</dt><dd>{form.values.trigger === "scheduled" ? `Programado: ${form.values.scheduleDate} a las ${form.values.scheduleTime}` : "Al entrar a la zona (geocerca)"}</dd></div>
                    <div><dt>Mensaje</dt><dd><b>{form.values.title}</b><br />{form.values.text}</dd></div>
                    <div><dt>Frecuencia y horario</dt><dd>Una notificación cada {form.values.frequencyDays} días · {form.values.startHour}–{form.values.endHour}</dd></div>
                  </dl>
                </div>
              )}
            </div>
            <div className="audience-wizard-actions">
              <button type="button" className="secondary-button" onClick={() => step === 0 ? navigate("/panel/geolocalizacion") : setStep(value => Math.max(0, value - 1))}>{step === 0 ? "Cancelar" : "Atrás"}</button>
              {step < STEPS.length - 1 ? <button type="button" className="primary-button" onClick={goNext}>Siguiente <Icon name="chevronRight" size={15} /></button> : (
                <div className="audience-submit-actions">
                  <button type="button" className="secondary-button" disabled={form.isSubmitting} onClick={() => submit("Borrador")}>Guardar borrador</button>
                  <button type="button" className="secondary-button" disabled={form.isSubmitting} onClick={() => submit("test")}>Enviar prueba a mi cuenta</button>
                  <button type="submit" className="primary-button" disabled={form.isSubmitting || !estimatedCount}>{form.isSubmitting ? "Guardando…" : form.values.trigger === "scheduled" ? "Programar audiencia" : "Activar audiencia"}</button>
                </div>
              )}
            </div>
          </form>
        </section>
        <aside className={`panel audience-wizard-preview${mobileMapOpen ? " open" : ""}`}>
          <div className="audience-preview-header"><div><h2>{step === 2 ? "Vista previa del aviso" : "Zona y alcance"}</h2><p>{step === 2 ? "Así verán el mensaje en su celular." : `${estimatedCount} personas elegibles`}</p></div><button className="secondary-button audience-preview-toggle" type="button" onClick={() => setMobileMapOpen(value => !value)} aria-expanded={mobileMapOpen}>{mobileMapOpen ? "Ocultar" : "Mostrar"} vista</button></div>
          {mobileMapOpen && (step === 2 ? <NotificationPreview title={form.values.title} message={form.values.text} action={form.values.action} /> : currentBranch ? (
            <GeoMap
              branch={selectedBranch}
              branches={branchList}
              customers={branchCustomers || []}
              radius={Number(form.values.radius)}
              district={form.values.zoneType === "district" ? form.values.district : undefined}
              onBranchMove={position => { setField("latitud", position.lat); setField("longitud", position.lng); }}
              ariaLabel="Mapa de vista previa de la zona seleccionada"
              fallback={selectedBranch ? <WizardMapFallback branch={selectedBranch} radius={Number(form.values.radius)} customers={legacyCustomers} onMove={legacyUpdate} onMoveEnd={legacyUpdate} /> : <div className="audience-map-offline" role="status">El mapa interactivo no está disponible. Se conservará la zona configurada.</div>}
            />
          ) : <Skeleton height={360} />)}
          {step !== 2 && <div className="audience-live-count"><strong>{estimatedCount}</strong><span>clientes alcanzables</span><small>{preview?.excluidosSinConsentimiento || 0} excluidos por privacidad</small></div>}
          {preview?.clientes?.length > 0 && step !== 2 && <ul className="audience-preview-people">{preview.clientes.slice(0, 5).map(person => <li key={person.id}><Avatar name={person.nombre} /><span><b>{person.nombre}</b><small>{person.distrito} · {formatDistance(person.distancia)}</small></span></li>)}</ul>}
          <p className="geo-privacy-note"><Icon name="target" size={15} /><span>Solo se notifica a clientes que aceptaron compartir su ubicación. Fidegresa no rastrea a las personas desde la web.</span></p>
        </aside>
      </div>
      <ConfirmDialog open={blocker.state === "blocked"} title="¿Salir sin guardar?" description="Tienes cambios sin guardar. Si sales ahora, se perderán." confirmLabel="Salir" onClose={closeBlocker} onConfirm={leave} />
    </>
  );
}

AudienceWizardForm.propTypes = { audience: PropTypes.object };

export default function AudienceWizardPage() {
  const audience = useLoaderData();
  return <AudienceWizardForm audience={audience?.notFound ? null : audience} />;
}
