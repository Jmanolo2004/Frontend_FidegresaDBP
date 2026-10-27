import { useState } from "react";
import PropTypes from "prop-types";
import { Modal } from "../common/Modal";
import { FormField } from "../common/FormField";
import { Icon } from "../common/Icon";
import { LoyaltyCard } from "./LoyaltyCard";
import { useForm } from "../../hooks/useForm";
import { useToast } from "../../hooks/useToast";
import { loyaltyProgramService } from "../../services/loyaltyProgramService";
import { CARD_TYPES } from "../../utils/constants";
import { maxLength, numberBetween, required } from "../../utils/validators";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_IMAGE_BYTES = 512000;

const baseRules = {
  nombre: [required("Escribe el nombre de la tarjeta."), maxLength(50, "Usa hasta 50 caracteres.")],
  negocio: [required("Elige el local asociado.")],
  descripcion: [required("Escribe el mensaje de beneficio."), maxLength(100, "Usa hasta 100 caracteres.")],
  premio: [required("Escribe el premio o nivel destacado."), maxLength(70, "Usa hasta 70 caracteres.")]
};

const typeRules = {
  Estampillas: { estampillas: [numberBetween(2, 12, "Elige entre 2 y 12 visitas.")] },
  Cashback: { porcentaje: [numberBetween(1, 50, "Elige un porcentaje entre 1% y 50%.")] },
  Niveles: {},
  Giftcard: { saldo: [numberBetween(1, 10000, "El saldo debe estar entre S/ 1 y S/ 10 000.")] }
};

function readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error("No se pudo leer la imagen seleccionada."));
    reader.readAsDataURL(file);
  });
}

function DesignerForm({ card, locations, onClose, onSaved }) {
  const { showToast, showError } = useToast();
  const [imageStatus, setImageStatus] = useState(card?.imagen ? "Imagen guardada en esta tarjeta." : "No has agregado una imagen.");
  const editing = Boolean(card);
  const [selectedType, setSelectedType] = useState(card?.tipo || "Estampillas");

  const form = useForm({
    initialValues: {
      nombre: card?.nombre || "",
      tipo: card?.tipo || "Estampillas",
      negocio: card?.negocio || locations[0]?.nombre || "",
      descripcion: card?.descripcion || "",
      premio: card?.premio || "",
      estampillas: card?.estampillas || 10,
      porcentaje: card?.porcentaje || 5,
      niveles: card?.niveles || 3,
      saldo: card?.saldo || 100,
      color: card?.color || "#603f2a",
      colorAcento: card?.colorAcento || "#c8894f",
      estilo: card?.estilo || "elegante",
      imagen: card?.imagen || "",
      mostrarProgreso: card?.mostrarProgreso !== false,
      mostrarQr: card?.mostrarQr !== false
    },
    rules: { ...baseRules, ...typeRules[selectedType] },
    onSubmit: async values => {
      const payload = {
        ...values,
        nombre: values.nombre.trim(),
        descripcion: values.descripcion.trim(),
        premio: values.premio.trim(),
        estampillas: Number(values.estampillas),
        porcentaje: Number(values.porcentaje),
        niveles: Number(values.niveles),
        saldo: Number(values.saldo)
      };
      try {
        const saved = editing ? await loyaltyProgramService.update(card.id, payload) : await loyaltyProgramService.create(payload);
        showToast(editing ? "Diseño de tarjeta actualizado." : "Programa creado con éxito.");
        onSaved(saved);
      } catch (error) {
        showError(error.message);
      }
    }
  });

  const { values, errors, getFieldProps, handleChange, setFieldValue } = form;

  const handleTypeChange = event => {
    setSelectedType(event.target.value);
    handleChange(event);
  };

  const handleImage = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES) {
      const message = file.size > MAX_IMAGE_BYTES ? "La imagen debe pesar 500 KB o menos." : "Elige una imagen PNG, JPG o WebP.";
      showError(message);
      setImageStatus(message);
      event.target.value = "";
      return;
    }
    try {
      setFieldValue("imagen", await readImage(file));
      setImageStatus(`Imagen lista: ${file.name}`);
    } catch {
      showError("No se pudo cargar la imagen seleccionada.");
    }
  };

  const removeImage = () => {
    setFieldValue("imagen", "");
    setImageStatus("No has agregado una imagen.");
  };

  const preview = {
    ...values,
    nombre: values.nombre || "Nombre de tu programa",
    descripcion: values.descripcion || "Tu beneficio aparecerá aquí",
    premio: values.premio || "Tu próxima recompensa",
    estampillas: Number(values.estampillas),
    porcentaje: Number(values.porcentaje),
    niveles: Number(values.niveles),
    saldo: Number(values.saldo)
  };

  return (
    <Modal
      open
      wide
      title={editing ? "Diseñar tarjeta" : "Crear programa de fidelización"}
      subtitle="Configura contenido, beneficios e identidad visual en un solo lugar."
      onClose={onClose}
      onSubmit={form.handleSubmit}
      submitLabel={editing ? "Guardar diseño" : "Crear programa"}
      submitting={form.isSubmitting}
    >
      <div className="card-designer">
        <div className="card-designer-form">
          <section className="designer-section">
            <div className="designer-section-title">
              <span>01</span>
              <div>
                <h3>Datos del programa</h3>
                <p>Define qué verá tu cliente.</p>
              </div>
            </div>
            <div className="form-grid">
              <FormField label="Nombre de la tarjeta" error={errors.nombre} full>
                <input className="form-control" maxLength={50} placeholder="Ej. Café de la Plaza" {...getFieldProps("nombre")} />
              </FormField>
              <FormField label="Tipo de programa">
                <select className="form-control" {...getFieldProps("tipo")} onChange={handleTypeChange}>
                  {CARD_TYPES.map(type => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Local asociado" error={errors.negocio}>
                <select className="form-control" {...getFieldProps("negocio")}>
                  {locations.map(location => (
                    <option key={location.id} value={location.nombre}>
                      {location.nombre}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Mensaje de beneficio" error={errors.descripcion} full>
                <input className="form-control" maxLength={100} placeholder="Ej. Tu décimo café va por nuestra cuenta" {...getFieldProps("descripcion")} />
              </FormField>
              {values.tipo === "Estampillas" && (
                <FormField label="Visitas para obtener premio" error={errors.estampillas}>
                  <input className="form-control" type="number" min={2} max={12} {...getFieldProps("estampillas")} />
                </FormField>
              )}
              {values.tipo === "Cashback" && (
                <FormField label="Cashback por compra (%)" error={errors.porcentaje}>
                  <input className="form-control" type="number" min={1} max={50} {...getFieldProps("porcentaje")} />
                </FormField>
              )}
              {values.tipo === "Niveles" && (
                <FormField label="Niveles del programa">
                  <select className="form-control" {...getFieldProps("niveles")}>
                    <option value={3}>3 niveles</option>
                    <option value={4}>4 niveles</option>
                  </select>
                </FormField>
              )}
              {values.tipo === "Giftcard" && (
                <FormField label="Saldo inicial (S/)" error={errors.saldo}>
                  <input className="form-control" type="number" min={1} max={10000} {...getFieldProps("saldo")} />
                </FormField>
              )}
              <FormField label="Premio o nivel destacado" error={errors.premio} full>
                <input className="form-control" maxLength={70} placeholder="Ej. Bebida gratis, nivel Oro o S/ 100 de saldo" {...getFieldProps("premio")} />
              </FormField>
            </div>
          </section>

          <section className="designer-section">
            <div className="designer-section-title">
              <span>02</span>
              <div>
                <h3>Identidad visual</h3>
                <p>Personaliza la imagen y los colores.</p>
              </div>
            </div>
            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="card-color">Color principal</label>
                <div className="color-control">
                  <input id="card-color" type="color" {...getFieldProps("color")} />
                  <output htmlFor="card-color">{values.color.toUpperCase()}</output>
                </div>
              </div>
              <div className="form-field">
                <label htmlFor="card-accent">Color de acento</label>
                <div className="color-control">
                  <input id="card-accent" type="color" {...getFieldProps("colorAcento")} />
                  <output htmlFor="card-accent">{values.colorAcento.toUpperCase()}</output>
                </div>
              </div>
              <FormField label="Estilo de tarjeta" full>
                <select className="form-control" {...getFieldProps("estilo")}>
                  <option value="elegante">Elegante · degradado y contraste</option>
                  <option value="corporativo">Corporativo · limpio y estructurado</option>
                  <option value="vibrante">Vibrante · acento protagonista</option>
                </select>
              </FormField>
              <div className="form-field full">
                <label htmlFor="card-image">
                  Imagen o logotipo <span className="optional-label">(opcional)</span>
                </label>
                <input id="card-image" className="form-control image-file-input" type="file" accept={IMAGE_TYPES.join(",")} onChange={handleImage} aria-describedby="card-image-hint card-image-status" />
                <small className="field-hint" id="card-image-hint">
                  PNG, JPG o WebP · máximo 500 KB.
                </small>
                <small className="field-hint" id="card-image-status" aria-live="polite">
                  {imageStatus}
                </small>
                {values.imagen && (
                  <button type="button" className="text-button image-remove" onClick={removeImage}>
                    Quitar imagen
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className="designer-section">
            <div className="designer-section-title">
              <span>03</span>
              <div>
                <h3>Elementos de la tarjeta</h3>
                <p>Elige qué información mostrar.</p>
              </div>
            </div>
            <div className="designer-toggles">
              <label>
                <input type="checkbox" name="mostrarProgreso" checked={values.mostrarProgreso} onChange={handleChange} />
                <span>
                  <strong>Progreso o beneficios</strong>
                  <small>Estampillas, niveles o cashback</small>
                </span>
              </label>
              <label>
                <input type="checkbox" name="mostrarQr" checked={values.mostrarQr} onChange={handleChange} />
                <span>
                  <strong>Código de cliente</strong>
                  <small>Para registrar visitas en caja</small>
                </span>
              </label>
            </div>
          </section>
        </div>
        <aside className="card-preview-panel">
          <div className="card-preview-heading">
            <div>
              <span className="preview-live-dot" /> VISTA PREVIA
            </div>
            <span>Frente de la tarjeta</span>
          </div>
          <div id="card-live-preview">
            <LoyaltyCard card={preview} />
          </div>
          <div className="preview-tip">
            <Icon name="star" size={15} /> Los cambios se reflejan al instante.
          </div>
          <p className="preview-disclaimer">Así verá tu cliente su tarjeta digital en el celular.</p>
        </aside>
      </div>
    </Modal>
  );
}

DesignerForm.propTypes = {
  card: PropTypes.object,
  locations: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.number, nombre: PropTypes.string })).isRequired,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired
};

export function CardDesignerDialog({ open, ...props }) {
  return open ? <DesignerForm {...props} /> : null;
}

CardDesignerDialog.propTypes = { open: PropTypes.bool.isRequired };
