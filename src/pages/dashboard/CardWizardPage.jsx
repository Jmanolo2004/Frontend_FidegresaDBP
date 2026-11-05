import { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useBlocker, useLoaderData, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CardBack } from "../../components/cards/CardBack";
import { CardFront } from "../../components/cards/CardFront";
import { CARD_TYPE_CONFIG, CARD_TYPE_KEYS, createDefaultRules, validateCardRules } from "../../components/cards/cardTypes";
import { PhoneMockup } from "../../components/cards/PhoneMockup";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { ErrorState } from "../../components/common/ErrorState";
import { FormField } from "../../components/common/FormField";
import { Icon } from "../../components/common/Icon";
import { PageHeader } from "../../components/common/PageHeader";
import { Skeleton } from "../../components/common/Skeleton";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useFetch } from "../../hooks/useFetch";
import { useForm } from "../../hooks/useForm";
import { useToast } from "../../hooks/useToast";
import { branchService } from "../../services/branchService";
import { loyaltyProgramService } from "../../services/loyaltyProgramService";
import { maxLength, numberBetween, required } from "../../utils/validators";

const STEPS = ["Tipo", "Datos", "Reglas", "Diseño", "Revisión"];
const COMMON_RULES = {
  nombre: [required("Escribe el nombre de la tarjeta."), maxLength(50, "Usa hasta 50 caracteres.")],
  negocio: [required("Elige el local asociado.")],
  vigenciaMeses: [numberBetween(1, 120, "La vigencia debe estar entre 1 y 120 meses.")]
};
const COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

function toFormValues(card, selectedType) {
  const type = card?.tipo || (CARD_TYPE_KEYS.includes(selectedType) ? selectedType : "");
  const rules = card?.reglas || createDefaultRules(type);
  return {
    tipo: type,
    nombre: card?.nombre || "",
    negocio: card?.negocio || "",
    descripcion: card?.descripcion || "",
    vigenciaMeses: card?.vigenciaMeses || 12,
    estado: card?.estado || "Activa",
    terminos: card?.terminos || "",
    primario: card?.colores?.primario || "#603f2a",
    acento: card?.colores?.acento || "#c8894f",
    estilo: card?.estilo || "elegante",
    imagen: card?.imagen || null,
    ...rules,
    montos: (rules.montos || []).join(", ")
  };
}

function buildRules(values) {
  const defaults = createDefaultRules(values.tipo);
  if (values.tipo === "Giftcard") {
    return {
      ...defaults,
      ...values,
      montos: String(values.montos || "").split(",").map(value => Number(value.trim())).filter(Number.isFinite)
    };
  }
  if (values.tipo === "Niveles") return { ...defaults, ...values };
  return { ...defaults, ...values };
}

function buildCard(values, estado) {
  return {
    nombre: values.nombre.trim(),
    tipo: values.tipo,
    negocio: values.negocio,
    descripcion: values.descripcion.trim(),
    colores: { primario: values.primario, acento: values.acento },
    estilo: values.estilo,
    imagen: values.imagen,
    estado,
    vigenciaMeses: Number(values.vigenciaMeses),
    terminos: values.terminos.trim(),
    reglas: buildRules(values)
  };
}

function RuleFields({ type, form, errors }) {
  const values = form.values;
  const rules = buildRules(values);
  const setValue = (name, value) => form.setFieldValue(name, value);
  if (type === "Estampillas") {
    return (
      <div className="form-grid">
        <FormField label="Meta de sellos" error={errors.sellosMeta} hint="Elige entre 4 y 12 sellos.">
          <input type="number" min="4" max="12" {...form.getFieldProps("sellosMeta")} />
        </FormField>
        <FormField label="Premio" error={errors.premio}>
          <input {...form.getFieldProps("premio")} placeholder="Un café gratis" />
        </FormField>
        <FormField label="Ícono de los sellos">
          <select {...form.getFieldProps("iconoSello")}><option value="star">Estrella</option><option value="reward">Regalo</option><option value="card">Sello geométrico</option></select>
        </FormField>
        <FormField label="Sello por">
          <select {...form.getFieldProps("selloPor")}><option value="visita">Visita</option><option value="compra mínima">Compra mínima</option></select>
        </FormField>
        <FormField label="Compra mínima (S/)" error={errors.montoMinimo} optional={values.selloPor !== "compra mínima"}>
          <input type="number" min="0" step="0.5" {...form.getFieldProps("montoMinimo")} disabled={values.selloPor !== "compra mínima"} />
        </FormField>
        <FormField label="Límite de sellos por día" error={errors.limitePorDia}>
          <input type="number" min="1" max="20" {...form.getFieldProps("limitePorDia")} />
        </FormField>
      </div>
    );
  }
  if (type === "Cashback") {
    const refund = Number(values.porcentaje || 0) * 0.4;
    return (
      <>
        <div className="form-grid">
          <FormField label="Porcentaje de cashback" error={errors.porcentaje} hint="Entre 1% y 30%.">
            <input type="number" min="1" max="30" step="0.5" {...form.getFieldProps("porcentaje")} />
          </FormField>
          <FormField label="Tope mensual (S/)" error={errors.topeMensual}>
            <input type="number" min="0" step="5" {...form.getFieldProps("topeMensual")} />
          </FormField>
          <FormField label="Saldo mínimo para canjear (S/)" error={errors.saldoMinimoCanje}>
            <input type="number" min="0" step="1" {...form.getFieldProps("saldoMinimoCanje")} />
          </FormField>
          <FormField label="Vigencia del saldo (días)" error={errors.expiraDias}>
            <input type="number" min="1" max="3650" {...form.getFieldProps("expiraDias")} />
          </FormField>
        </div>
        <p className="card-wizard-example">Con {values.porcentaje}% de cashback, una compra de S/ 40 devuelve S/ {Number.isFinite(refund) ? refund.toFixed(2) : "0.00"}.</p>
      </>
    );
  }
  if (type === "Niveles") {
    return (
      <>
        <div className="form-grid">
          <FormField label="Puntos por cada sol" error={errors.puntosPorSol}>
            <input type="number" min="1" max="1000" {...form.getFieldProps("puntosPorSol")} />
          </FormField>
        </div>
        <div className="card-tier-editor">
          <div className="card-tier-editor-heading"><strong>Niveles y beneficios</strong><span>De 3 a 5 niveles en orden ascendente de puntos.</span></div>
          {(values.niveles || []).map((level, index) => (
            <div className="card-tier-editor-row" key={`tier-${index}`}>
              <FormField label={`Nivel ${index + 1}`}>
                <input aria-label={`Nombre del nivel ${index + 1}`} value={level.nombre} onChange={event => setValue("niveles", values.niveles.map((item, itemIndex) => itemIndex === index ? { ...item, nombre: event.target.value } : item))} />
              </FormField>
              <FormField label="Desde puntos">
                <input type="number" min="0" aria-label={`Puntos del nivel ${index + 1}`} value={level.desdePuntos} onChange={event => setValue("niveles", values.niveles.map((item, itemIndex) => itemIndex === index ? { ...item, desdePuntos: Number(event.target.value) } : item))} />
              </FormField>
              <FormField label="Beneficio">
                <input aria-label={`Beneficio del nivel ${index + 1}`} value={level.beneficio} onChange={event => setValue("niveles", values.niveles.map((item, itemIndex) => itemIndex === index ? { ...item, beneficio: event.target.value } : item))} />
              </FormField>
              <button type="button" className="card-tier-color" aria-label={`Color del nivel ${index + 1}`}><input type="color" value={level.color} onChange={event => setValue("niveles", values.niveles.map((item, itemIndex) => itemIndex === index ? { ...item, color: event.target.value } : item))} /></button>
              {values.niveles.length > 3 && <button type="button" className="small-action danger-text" onClick={() => setValue("niveles", values.niveles.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Quitar nivel ${index + 1}`}>Quitar</button>}
            </div>
          ))}
          {errors.niveles && <p className="field-error" role="alert">{errors.niveles}</p>}
          {values.niveles.length < 5 && <button type="button" className="secondary-button" onClick={() => setValue("niveles", [...values.niveles, { nombre: `Nivel ${values.niveles.length + 1}`, desdePuntos: Number(values.niveles.at(-1)?.desdePuntos || 0) + 100, beneficio: "Nuevo beneficio", color: "#c8894f" }])}>Agregar nivel</button>}
        </div>
      </>
    );
  }
  const selectedAmounts = String(values.montos || "");
  return (
    <div className="form-grid">
      <FormField label="Montos predefinidos (S/)" error={errors.montos} hint="Separa los montos con comas, por ejemplo 50, 100, 200.">
        <input value={selectedAmounts} onChange={event => setValue("montos", event.target.value)} />
      </FormField>
      <FormField label="Monto mínimo (S/)" error={errors.montoMin}>
        <input type="number" min="1" step="1" {...form.getFieldProps("montoMin")} />
      </FormField>
      <FormField label="Monto máximo (S/)" error={errors.montoMax}>
        <input type="number" min="1" step="1" {...form.getFieldProps("montoMax")} />
      </FormField>
      <FormField label="Vigencia (meses)" error={errors.vigenciaMeses}>
        <input type="number" min="1" max="120" {...form.getFieldProps("vigenciaMeses")} />
      </FormField>
      <FormField label="Mensaje de regalo" error={errors.mensajeRegalo} full>
        <input {...form.getFieldProps("mensajeRegalo")} maxLength="120" />
      </FormField>
      <label className="card-checkbox"><input type="checkbox" checked={Boolean(values.permiteMontoLibre)} onChange={event => setValue("permiteMontoLibre", event.target.checked)} />Permitir monto personalizado</label>
      <p className="card-wizard-example">La persona que regala podrá elegir entre {rules.montos.join(", ")} soles.</p>
    </div>
  );
}

RuleFields.propTypes = {
  type: PropTypes.string.isRequired,
  form: PropTypes.object.isRequired,
  errors: PropTypes.object.isRequired
};

function CardWizardForm({ card, locations }) {
  const isEditing = Boolean(card);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedType = searchParams.get("tipo");
  const initialValues = useMemo(() => toFormValues(card, selectedType), [card, selectedType]);
  const savedSuccessfully = useRef(false);
  const form = useForm({
    initialValues,
    rules: COMMON_RULES,
    onSubmit: async values => {
      const ruleErrors = validateCardRules(values.tipo, buildRules(values));
      const designErrors = {};
      if (!COLOR_PATTERN.test(values.primario)) designErrors.primario = "Elige un color válido.";
      if (!COLOR_PATTERN.test(values.acento)) designErrors.acento = "Elige un color válido.";
      if (Object.keys(ruleErrors).length || Object.keys(designErrors).length) {
        form.setErrors({ ...ruleErrors, ...designErrors });
        setStep(ruleErrors.tipo ? 0 : Object.keys(ruleErrors).length ? 2 : 3);
        return;
      }
      const status = submitStatus.current;
      try {
        const payload = buildCard(values, status);
        const saved = isEditing
          ? await loyaltyProgramService.update(card.id, payload)
          : await loyaltyProgramService.create(payload);
        showToast(isEditing ? "Tarjeta actualizada correctamente." : status === "Borrador" ? "Borrador guardado correctamente." : "Tarjeta publicada correctamente.");
        savedSuccessfully.current = true;
        navigate(`/panel/tarjetas/${saved.id}`);
      } catch (error) {
        showError(error.message);
      }
    }
  });
  const { showToast, showError } = useToast();
  const [step, setStep] = useState(0);
  const [previewTab, setPreviewTab] = useState("front");
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(true);
  const submitStatus = useRef("Activa");
  const dirty = JSON.stringify(form.values) !== JSON.stringify(initialValues);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => !savedSuccessfully.current && dirty && currentLocation.pathname !== nextLocation.pathname);

  useEffect(() => {
    const beforeUnload = event => {
      if (!dirty || savedSuccessfully.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  const updateType = type => {
    const nextRules = createDefaultRules(type);
    for (const [key, value] of Object.entries(nextRules)) {
      form.setFieldValue(key, key === "montos" ? value.join(", ") : value);
    }
    form.setFieldValue("tipo", type);
    form.setErrors({});
  };

  const validateStep = () => {
    const errors = {};
    if (step === 0 && !CARD_TYPE_CONFIG[form.values.tipo]) errors.tipo = "Elige un tipo de tarjeta para continuar.";
    if (step === 1) {
      for (const field of ["nombre", "negocio", "vigenciaMeses"]) {
        const validation = COMMON_RULES[field].map(validate => validate(form.values[field])).find(Boolean);
        if (validation) errors[field] = validation;
      }
    }
    if (step === 2) Object.assign(errors, validateCardRules(form.values.tipo, buildRules(form.values)));
    if (step === 3) {
      if (!COLOR_PATTERN.test(form.values.primario)) errors.primario = "Elige un color válido.";
      if (!COLOR_PATTERN.test(form.values.acento)) errors.acento = "Elige un color válido.";
    }
    form.setErrors(errors);
    if (Object.keys(errors).length) {
      document.querySelector(`[name="${Object.keys(errors)[0]}"]`)?.focus();
      return false;
    }
    return true;
  };

  const nextStep = () => {
    if (!validateStep()) return;
    setStep(value => Math.min(STEPS.length - 1, value + 1));
  };

  const handleImage = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      form.setErrors({ ...form.errors, imagen: "El logo debe ser PNG, JPG o WebP." });
      event.target.value = "";
      return;
    }
    if (file.size > 500 * 1024) {
      form.setErrors({ ...form.errors, imagen: "La imagen debe pesar 500 KB o menos." });
      event.target.value = "";
      return;
    }
    try {
      const image = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("No pudimos leer la imagen."));
        reader.onerror = () => reject(new Error("No pudimos leer la imagen."));
        reader.readAsDataURL(file);
      });
      form.setFieldValue("imagen", image);
      form.setErrors({ ...form.errors, imagen: "" });
    } catch (error) {
      showError(error.message);
    }
  };

  const previewCard = {
    ...form.values,
    colores: { primario: form.values.primario, acento: form.values.acento },
    reglas: buildRules(form.values)
  };

  return (
    <div className="card-wizard-page">
      <PageHeader title={isEditing ? "Editar tarjeta" : "Crear tarjeta"} summary="Configura cada detalle de tu programa de fidelización." />
      <div className="card-wizard-layout">
        <section className="panel card-wizard-form-panel">
          <ol className="card-wizard-steps" aria-label="Pasos para crear una tarjeta">
            {STEPS.map((item, index) => (
              <li key={item} className={index === step ? "current" : index < step ? "complete" : ""}>
                <button type="button" aria-current={index === step ? "step" : undefined} onClick={() => index < step && setStep(index)}>
                  <span>{index < step ? "✓" : index + 1}</span><small>{item}</small>
                </button>
              </li>
            ))}
          </ol>
          <form onSubmit={event => { event.preventDefault(); if (step < STEPS.length - 1) nextStep(); else form.handleSubmit(event); }} noValidate>
            <div className="card-wizard-step-content">
              <p className="card-wizard-step-count">PASO {step + 1} DE {STEPS.length}</p>
              <h2>{["Elige el tipo de tarjeta", "Cuéntanos lo básico", "Define cómo funciona", "Personaliza el diseño", "Revisa y publica"][step]}</h2>

              {step === 0 && (
                <>
                  <div className="card-type-choice-grid">
                    {CARD_TYPE_KEYS.map(type => {
                      const sample = { nombre: CARD_TYPE_CONFIG[type].label, tipo: type, negocio: "Tu negocio", colores: { primario: "#603f2a", acento: "#c8894f" }, reglas: createDefaultRules(type) };
                      return (
                        <button type="button" key={type} className={`card-type-choice${form.values.tipo === type ? " selected" : ""}`} onClick={() => updateType(type)} aria-pressed={form.values.tipo === type}>
                          <CardFront card={sample} size="sm" />
                          <span className="card-type-choice-copy"><strong><Icon name={CARD_TYPE_CONFIG[type].icon} size={15} />{CARD_TYPE_CONFIG[type].label}</strong><small>{CARD_TYPE_CONFIG[type].description}</small><small><b>Ideal para:</b> {CARD_TYPE_CONFIG[type].ideal}</small><small><b>Ejemplo:</b> {CARD_TYPE_CONFIG[type].example}</small></span>
                        </button>
                      );
                    })}
                  </div>
                  {form.errors.tipo && <p className="field-error" role="alert">{form.errors.tipo}</p>}
                </>
              )}

              {step === 1 && (
                <div className="form-grid">
                  <FormField label="Nombre de la tarjeta" error={form.errors.nombre} hint="Hasta 50 caracteres.">
                    <input maxLength="50" placeholder="Ej. Un café con cariño" {...form.getFieldProps("nombre")} />
                  </FormField>
                  <FormField label="Local asociado" error={form.errors.negocio}>
                    <select {...form.getFieldProps("negocio")}><option value="">Elige un local</option>{locations.map(location => <option key={location.id} value={location.nombre}>{location.nombre}</option>)}</select>
                  </FormField>
                  <FormField label="Descripción del beneficio" optional full>
                    <textarea maxLength="160" rows="3" placeholder="Cuéntales a tus clientes qué recibirán." {...form.getFieldProps("descripcion")} />
                  </FormField>
                  <FormField label="Vigencia de la tarjeta (meses)" error={form.errors.vigenciaMeses}>
                    <input type="number" min="1" max="120" {...form.getFieldProps("vigenciaMeses")} />
                  </FormField>
                  <FormField label="Estado inicial">
                    <select {...form.getFieldProps("estado")}><option value="Activa">Activa</option><option value="En pausa">En pausa</option><option value="Borrador">Borrador</option></select>
                  </FormField>
                </div>
              )}

              {step === 2 && <RuleFields type={form.values.tipo || "Estampillas"} form={form} errors={form.errors} />}

              {step === 3 && (
                <div className="form-grid">
                  <FormField label="Color principal" error={form.errors.primario}>
                    <input type="color" value={form.values.primario} onChange={event => form.setFieldValue("primario", event.target.value)} />
                  </FormField>
                  <FormField label="Color de acento" error={form.errors.acento}>
                    <input type="color" value={form.values.acento} onChange={event => form.setFieldValue("acento", event.target.value)} />
                  </FormField>
                  <FormField label="Estilo visual">
                    <select {...form.getFieldProps("estilo")}><option value="elegante">Elegante</option><option value="minimal">Minimalista</option><option value="vibrante">Vibrante</option></select>
                  </FormField>
                  <FormField label="Logo (PNG, JPG o WebP · máximo 500 KB)" error={form.errors.imagen} optional>
                    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImage} />
                  </FormField>
                  {form.values.imagen && <button type="button" className="small-action danger-text" onClick={() => form.setFieldValue("imagen", null)}>Quitar logo</button>}
                </div>
              )}

              {step === 4 && (
                <div className="card-wizard-review">
                  <dl>
                    <div><dt>Tipo</dt><dd>{CARD_TYPE_CONFIG[form.values.tipo]?.label}</dd></div>
                    <div><dt>Nombre</dt><dd>{form.values.nombre || "Sin nombre"}</dd></div>
                    <div><dt>Local</dt><dd>{form.values.negocio || "Sin local"}</dd></div>
                    <div><dt>Estado inicial</dt><dd>{form.values.estado}</dd></div>
                    <div><dt>Vigencia</dt><dd>{form.values.vigenciaMeses} meses</dd></div>
                  </dl>
                  <FormField label="Términos y condiciones" optional>
                    <textarea maxLength="2000" rows="5" placeholder="Agrega condiciones que deban conocer tus clientes." {...form.getFieldProps("terminos")} />
                  </FormField>
                  <p className="card-wizard-example">{CARD_TYPE_CONFIG[form.values.tipo]?.example}</p>
                  {form.errors.form && <p className="field-error" role="alert">{form.errors.form}</p>}
                </div>
              )}
            </div>
            <div className="card-wizard-actions">
              <button type="button" className="secondary-button" onClick={() => step === 0 ? navigate("/panel/tarjetas") : setStep(value => Math.max(0, value - 1))}>
                {step === 0 ? "Cancelar" : "Atrás"}
              </button>
              {step < STEPS.length - 1 ? (
                <button type="button" className="primary-button" onClick={nextStep}>Siguiente <Icon name="chevronRight" size={15} /></button>
              ) : (
                <div className="card-wizard-submit-actions">
                  <button type="submit" className="secondary-button" disabled={form.isSubmitting} onClick={() => { submitStatus.current = "Borrador"; }}>Guardar borrador</button>
                  <button type="submit" className="primary-button" disabled={form.isSubmitting} onClick={() => { submitStatus.current = form.values.estado === "Borrador" ? "Activa" : form.values.estado; }}>
                    {form.isSubmitting ? "Guardando…" : "Publicar tarjeta"}
                  </button>
                </div>
              )}
            </div>
          </form>
        </section>

        <aside className="panel card-wizard-preview-panel">
          <button type="button" className="card-preview-mobile-toggle" aria-expanded={mobilePreviewOpen} onClick={() => setMobilePreviewOpen(value => !value)}>
            Vista previa <Icon name="chevron" size={16} />
          </button>
          <div className={`card-wizard-preview-content${mobilePreviewOpen ? " open" : ""}`}>
            <h2>Vista previa</h2>
            <div className="card-preview-tabs" role="tablist" aria-label="Vistas previas de tarjeta">
              <button type="button" role="tab" aria-selected={previewTab === "front"} onClick={() => setPreviewTab("front")}>Frente</button>
              <button type="button" role="tab" aria-selected={previewTab === "back"} onClick={() => setPreviewTab("back")}>Reverso (QR)</button>
              <button type="button" role="tab" aria-selected={previewTab === "phone"} onClick={() => setPreviewTab("phone")}>Celular</button>
            </div>
            <div className="card-preview-stage">
              {previewTab === "front" && <CardFront card={previewCard} size="md" />}
              {previewTab === "back" && <CardBack card={previewCard} />}
              {previewTab === "phone" && <PhoneMockup card={previewCard} />}
            </div>
            <p className="card-preview-note">La tarjeta no muestra un QR real hasta que el cliente la tenga en su cuenta.</p>
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={blocker.state === "blocked"}
        title="¿Salir sin guardar?"
        description="Tienes cambios sin guardar. Si sales ahora, se perderán."
        confirmLabel="Salir"
        onConfirm={() => blocker.proceed()}
        onClose={() => blocker.reset()}
      />
    </div>
  );
}

CardWizardForm.propTypes = { card: PropTypes.object, locations: PropTypes.array.isRequired };

export default function CardWizardPage() {
  const { programId } = useParams();
  const editing = Boolean(programId);
  const loadedCard = useLoaderData();
  const navigate = useNavigate();
  const locations = useFetch(({ signal }) => branchService.getAll({ signal }), []);
  useDocumentTitle(editing ? "Editar tarjeta" : "Crear tarjeta");

  if (loadedCard?.notFound) {
    return <EmptyState message="No encontramos la tarjeta que quieres editar." actionLabel="Volver a tarjetas" onAction={() => navigate("/panel/tarjetas")} />;
  }
  if ((editing && !loadedCard) || !locations.data) {
    if (locations.error) return <ErrorState error={locations.error} onRetry={locations.reload} />;
    return <Skeleton height={520} radius={14} />;
  }
  return <CardWizardForm card={loadedCard} locations={locations.data} />;
}
