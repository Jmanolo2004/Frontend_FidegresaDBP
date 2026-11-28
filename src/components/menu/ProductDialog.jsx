import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Modal } from "../common/Modal";
import { FormField } from "../common/FormField";
import { useAuthFile } from "../../hooks/useAuthFile";
import { useToast } from "../../hooks/useToast";
import { menuService } from "../../services/menuService";

const EMPTY = { name: "", description: "", price: "", inStock: true };

function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = "Escribe el nombre del producto.";
  const price = Number(form.price);
  if (form.price === "" || Number.isNaN(price)) errors.price = "Escribe el precio.";
  else if (price <= 0) errors.price = "El precio debe ser mayor que cero.";
  else if (!/^\d+(\.\d{1,2})?$/.test(String(form.price))) errors.price = "Usa hasta dos decimales.";
  return errors;
}

/** Crear o editar un producto oficial, con su foto. */
export function ProductDialog({ open, branchId, product, onClose, onSaved }) {
  const { showToast, showError } = useToast();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const currentPhoto = useAuthFile(open ? product?.imageUrl : null);

  useEffect(() => {
    if (!open) return;
    setForm(product ? { name: product.name, description: product.description || "", price: String(product.price), inStock: product.inStock } : EMPTY);
    setErrors({});
    setPhoto(null);
  }, [open, product]);

  useEffect(() => {
    if (!photo) {
      setPhotoPreview(null);
      return undefined;
    }
    const url = URL.createObjectURL(photo);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const change = field => event => setForm(previous => ({ ...previous, [field]: event.target.value }));

  const submit = async () => {
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    try {
      const body = { name: form.name.trim(), description: form.description.trim(), price: Number(form.price), inStock: form.inStock };
      let saved = product ? await menuService.updateProduct(branchId, product.id, body) : await menuService.createProduct(branchId, body);
      if (photo) saved = await menuService.uploadProductImage(branchId, saved.id, photo);
      showToast(product ? "Producto actualizado." : "Producto agregado a la carta.");
      onSaved(saved);
    } catch (error) {
      showError(error.message || "No pudimos guardar el producto.");
    } finally {
      setSaving(false);
    }
  };

  const shownPhoto = photoPreview || currentPhoto;

  return (
    <Modal open={open} title={product ? "Editar producto" : "Agregar producto"} subtitle="Se muestra en Productos Oficiales de tu carta." onClose={onClose} onSubmit={submit} submitting={saving} submitLabel={product ? "Guardar cambios" : "Agregar producto"}>
      <div className="form-grid">
        <FormField label="Nombre" error={errors.name} full>
          <input className="form-control" maxLength={80} placeholder="Ej. Lomo saltado" value={form.name} onChange={change("name")} />
        </FormField>
        <FormField label="Descripción" optional full>
          <textarea className="form-control" rows={3} maxLength={240} placeholder="Ingredientes o detalles del producto" value={form.description} onChange={change("description")} />
        </FormField>
        <FormField label="Precio (S/)" error={errors.price}>
          <input className="form-control" type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="25.00" value={form.price} onChange={change("price")} />
        </FormField>
        <FormField label="Disponibilidad">
          <select className="form-control" value={form.inStock ? "si" : "no"} onChange={event => setForm(previous => ({ ...previous, inStock: event.target.value === "si" }))}>
            <option value="si">En stock</option>
            <option value="no">Agotado</option>
          </select>
        </FormField>
        <FormField label="Foto" optional hint="JPG, PNG o WebP de hasta 5 MB." full>
          <input className="form-control" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => setPhoto(event.target.files?.[0] || null)} />
        </FormField>
      </div>
      {shownPhoto && <img className="product-dialog-photo" src={shownPhoto} alt="Vista previa de la foto del producto" />}
    </Modal>
  );
}

ProductDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  branchId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  product: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired
};
