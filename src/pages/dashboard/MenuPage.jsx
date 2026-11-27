import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import { Icon } from "../../components/common/Icon";
import { Modal } from "../../components/common/Modal";
import { FormField } from "../../components/common/FormField";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { EmptyState } from "../../components/common/EmptyState";
import { ErrorState } from "../../components/common/ErrorState";
import { Skeleton } from "../../components/common/Skeleton";
import { InvitationCard, PdfCatalogCard, ProductCard, WebCatalogCard } from "../../components/menu/MenuCards";
import { InvitationDialog } from "../../components/menu/InvitationDialog";
import { ProductDialog } from "../../components/menu/ProductDialog";
import { useFetch } from "../../hooks/useFetch";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useToast } from "../../hooks/useToast";
import { menuService } from "../../services/menuService";
import { loyaltyProgramService } from "../../services/loyaltyProgramService";
import "../../styles/menu.css";

export default function MenuPage() {
  useDocumentTitle("Menú");
  const { branches, branchesLoading, branchesError, reloadBranches } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast, showError } = useToast();

  // El local sale del selector de la barra superior (?branchId=); si no hay, se usa el primero.
  const selectedId = searchParams.get("branchId") || (branches[0] ? String(branches[0].id) : "");
  const branch = branches.find(item => String(item.id) === selectedId);
  const branchId = branch?.id;

  const menu = useFetch(
    async ({ signal }) => {
      const [catalogs, invitation, products] = await Promise.all([
        menuService.getCatalogs(branchId, { signal }),
        menuService.getInvitation(branchId, { signal }),
        menuService.getProducts(branchId, { signal })
      ]);
      return { catalogs, invitation, products };
    },
    [branchId],
    { enabled: Boolean(branchId) }
  );
  const programsRequest = useFetch(({ signal }) => loyaltyProgramService.getAll({}, { signal }), []);

  const [productDialog, setProductDialog] = useState({ open: false, product: null });
  const [toDelete, setToDelete] = useState(null);
  const [invitationOpen, setInvitationOpen] = useState(false);
  const [webOpen, setWebOpen] = useState(false);
  const [webUrl, setWebUrl] = useState("");
  const [webError, setWebError] = useState("");
  const [savingWeb, setSavingWeb] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const data = menu.data;
  const products = data?.products || [];
  const inStock = products.filter(product => product.inStock).length;

  // Tarjetas que se pueden ofrecer en la invitación: del local, activas y que no sean gift card.
  const programs = useMemo(
    () => (programsRequest.data || []).filter(program => program.negocio === branch?.nombre && program.estado === "Activa" && program.tipo !== "Giftcard"),
    [programsRequest.data, branch?.nombre]
  );

  useEffect(() => {
    if (webOpen) {
      setWebUrl(data?.catalogs?.web?.url || "");
      setWebError("");
    }
  }, [webOpen, data?.catalogs?.web?.url]);

  const update = patch => menu.setData(previous => ({ ...previous, ...patch }));
  const updateCatalog = (type, catalog) => update({ catalogs: { ...data.catalogs, [type]: catalog } });

  const selectBranch = event => {
    const next = new URLSearchParams(searchParams);
    next.set("branchId", event.target.value);
    setSearchParams(next);
  };

  const uploadPdf = async file => {
    setUploading(true);
    try {
      updateCatalog("pdf", await menuService.uploadPdfFile(branchId, file));
      showToast("Catálogo actualizado.");
    } catch (error) {
      showError(error.message || "No pudimos subir el archivo.");
    } finally {
      setUploading(false);
    }
  };

  const deletePdfFile = async file => {
    try {
      updateCatalog("pdf", await menuService.deletePdfFile(branchId, file.id));
      showToast("Archivo quitado del catálogo.");
    } catch (error) {
      showError(error.message || "No pudimos quitar el archivo.");
    }
  };

  const saveWeb = async () => {
    const value = webUrl.trim();
    if (!/^https?:\/\/\S+\.\S+/.test(value)) {
      setWebError("Escribe un enlace que empiece con https://");
      return;
    }
    setSavingWeb(true);
    try {
      updateCatalog("web", await menuService.saveWeb(branchId, value, true));
      setWebOpen(false);
      showToast("Catálogo web guardado.");
    } catch (error) {
      setWebError(error.message || "No pudimos guardar el enlace.");
    } finally {
      setSavingWeb(false);
    }
  };

  const toggleStock = async product => {
    setBusyId(product.id);
    try {
      const saved = await menuService.setProductStock(branchId, product.id, !product.inStock);
      update({ products: products.map(item => (item.id === saved.id ? saved : item)) });
      showToast(saved.inStock ? `${saved.name} vuelve a estar disponible.` : `${saved.name} marcado como agotado.`);
    } catch (error) {
      showError(error.message || "No pudimos cambiar el stock.");
    } finally {
      setBusyId(null);
    }
  };

  const productSaved = saved => {
    const exists = products.some(item => item.id === saved.id);
    update({ products: exists ? products.map(item => (item.id === saved.id ? saved : item)) : [...products, saved] });
    setProductDialog({ open: false, product: null });
  };

  const deleteProduct = async () => {
    try {
      await menuService.deleteProduct(branchId, toDelete.id);
      update({ products: products.filter(item => item.id !== toDelete.id) });
      showToast("Producto eliminado.");
      setToDelete(null);
    } catch (error) {
      showError(error.message || "No pudimos eliminar el producto.");
    }
  };

  if (branchesError) return <ErrorState error={branchesError} onRetry={reloadBranches} />;
  if (!branchesLoading && branches.length === 0) {
    return <EmptyState message="Primero agrega un local para armar su menú." actionLabel="Ir a Ubicaciones" onAction={() => navigate("/panel/ubicaciones")} />;
  }

  return (
    <>
      <section className="panel menu-hero">
        <span className="menu-hero-icon">
          <Icon name="book" size={26} />
        </span>
        <div className="menu-hero-copy">
          <h1>Menú</h1>
          <p>Gestiona la carta y los productos de tu negocio.</p>
        </div>
        <div className="menu-hero-actions">
          <select className="form-control menu-branch-select" value={selectedId} onChange={selectBranch} aria-label="Local" disabled={branchesLoading}>
            {branches.map(item => (
              <option key={item.id} value={item.id}>{item.nombre}</option>
            ))}
          </select>
          <button type="button" className="primary-button" onClick={() => setProductDialog({ open: true, product: null })} disabled={!data}>
            <Icon name="plus" size={16} />
            Añadir
          </button>
        </div>
      </section>

      {menu.error && !data ? (
        <ErrorState error={menu.error} onRetry={menu.reload} />
      ) : !data ? (
        <>
          <div className="menu-grid">
            {[0, 1, 2].map(index => <Skeleton key={index} height={330} radius={13} />)}
          </div>
          <Skeleton height={380} radius={13} />
        </>
      ) : (
        <>
          <div className="menu-grid">
            <PdfCatalogCard catalog={data.catalogs.pdf} uploading={uploading} onUpload={uploadPdf} onDeleteFile={deletePdfFile} />
            <WebCatalogCard catalog={data.catalogs.web} onEdit={() => setWebOpen(true)} />
            <InvitationCard invitation={data.invitation} onEdit={() => setInvitationOpen(true)} />
          </div>

          <section className="panel menu-products">
            <div className="menu-products-head">
              <div>
                <h2>Productos Oficiales</h2>
                <p>
                  Gestiona los productos destacados de la carta de {branch?.nombre}.{" "}
                  {products.length > 0 && `${inStock} de ${products.length} en stock.`}
                </p>
              </div>
              <button type="button" className="primary-button" onClick={() => setProductDialog({ open: true, product: null })}>
                <Icon name="plus" size={16} />
                Agregar Producto
              </button>
            </div>
            {products.length === 0 ? (
              <EmptyState message="Todavía no hay productos en la carta de este local." actionLabel="Agregar producto" onAction={() => setProductDialog({ open: true, product: null })} />
            ) : (
              <div className="product-grid">
                {products.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    busy={busyId === product.id}
                    onToggleStock={toggleStock}
                    onEdit={item => setProductDialog({ open: true, product: item })}
                    onDelete={setToDelete}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <ProductDialog open={productDialog.open} branchId={branchId} product={productDialog.product} onClose={() => setProductDialog({ open: false, product: null })} onSaved={productSaved} />
      <InvitationDialog
        open={invitationOpen}
        branchId={branchId}
        invitation={data?.invitation}
        programs={programs}
        onClose={() => setInvitationOpen(false)}
        onSaved={saved => {
          update({ invitation: saved });
          setInvitationOpen(false);
        }}
      />
      <Modal open={webOpen} title="Catálogo web" subtitle="Pega el enlace de tu carta web o de una página externa." onClose={() => setWebOpen(false)} onSubmit={saveWeb} submitting={savingWeb}>
        <FormField label="Enlace" error={webError} full>
          <input className="form-control" type="url" placeholder="https://tu-negocio.com/carta" value={webUrl} onChange={event => setWebUrl(event.target.value)} />
        </FormField>
      </Modal>
      <ConfirmDialog
        open={Boolean(toDelete)}
        title={`¿Eliminar ${toDelete?.name || "producto"}?`}
        description="Se quitará de la carta de este local."
        confirmLabel="Eliminar"
        onConfirm={deleteProduct}
        onClose={() => setToDelete(null)}
      />
      {programs.length === 0 && programsRequest.data && data?.invitation && !data.invitation.program && (
        <p className="menu-tip">
          Para que la invitación funcione, este local necesita una tarjeta activa. <Link to="/panel/tarjetas">Ir a Tarjetas</Link>.
        </p>
      )}
    </>
  );
}
