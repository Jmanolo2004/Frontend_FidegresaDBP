import { useEffect, useRef, useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { PanelHeading } from "../../components/common/PanelHeading";
import { SearchInput } from "../../components/common/SearchInput";
import { FilterSelect } from "../../components/common/FilterSelect";
import { Pagination } from "../../components/common/Pagination";
import { EmptyState } from "../../components/common/EmptyState";
import { ErrorState } from "../../components/common/ErrorState";
import { Icon } from "../../components/common/Icon";
import { TableSkeleton } from "../../components/common/Skeleton";
import { CustomerTable } from "../../components/customers/CustomerTable";
import { CustomerDialog } from "../../components/customers/CustomerDialog";
import { useFetch } from "../../hooks/useFetch";
import { usePagination } from "../../hooks/usePagination";
import { useToast } from "../../hooks/useToast";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { customerService } from "../../services/customerService";
import { branchService } from "../../services/branchService";
import { downloadCsv } from "../../utils/csv";
import { formatDate } from "../../utils/format";

const STATUS_OPTIONS = [
  { value: "Todos", label: "Todos" },
  { value: "Activa", label: "Activos" },
  { value: "Inactiva", label: "Inactivos" }
];

const SORT_OPTIONS = [
  { value: "recent", label: "Más recientes" },
  { value: "name", label: "Nombre (A-Z)" },
  { value: "visits", label: "Más visitas" }
];

export default function CustomersPage() {
  useDocumentTitle("Clientes");
  const { showToast, showError } = useToast();
  const { page, size, filters, setPage, setSize, setFilter, setFilters } = usePagination({ q: "", estado: "Todos", orden: "recent" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef(null);
  const exportButtonRef = useRef(null);

  useEffect(() => {
    if (!exportMenuOpen) return undefined;
    const closeOnOutsideClick = event => {
      if (!exportMenuRef.current?.contains(event.target)) setExportMenuOpen(false);
    };
    const closeOnEscape = event => {
      if (event.key === "Escape") {
        setExportMenuOpen(false);
        exportButtonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [exportMenuOpen]);

  const stats = useFetch(({ signal }) => customerService.getStats({ signal }), []);
  const customers = useFetch(
    ({ signal }) => customerService.getPage({ page, size, search: filters.q, status: filters.estado, sort: filters.orden }, { signal }),
    [page, size, filters.q, filters.estado, filters.orden]
  );
  const locations = useFetch(({ signal }) => branchService.getAll({ signal }), [], { enabled: dialogOpen });

  const pageData = customers.data;
  const hasFilters = filters.q || filters.estado !== "Todos";

  const exportCustomers = async format => {
    setExportMenuOpen(false);
    exportButtonRef.current?.focus();
    setExporting(true);
    try {
      const rows = await customerService.getAllForExport({ search: filters.q, status: filters.estado, sort: filters.orden });
      const data = [
        ["Nombre", "Correo", "Teléfono", "Local", "Distrito", "Estado", "Visitas", "Última visita"],
        ...rows.map(person => [person.nombre, person.correo, person.telefono, person.localNombre, person.distrito, person.estado, person.visitas, formatDate(person.ultimaVisita)])
      ];
      if (format === "xlsx") {
        const { default: writeExcelFile } = await import("write-excel-file/browser");
        const cells = data.map(row => row.map(value => typeof value === "number" ? value : String(value ?? "")));
        await writeExcelFile(cells, { sheet: "Clientes" }).toFile("clientes-fidegresa.xlsx");
      } else {
        downloadCsv("clientes-fidegresa.csv", data);
      }
      showToast(`Lista de ${rows.length} clientes descargada.`);
    } catch (error) {
      showError(error.message);
    } finally {
      setExporting(false);
    }
  };

  const handleCreated = () => {
    setDialogOpen(false);
    stats.refresh();
    if (page === 0) customers.refresh();
    else setPage(0);
  };

  const activeLabel = stats.data ? `${stats.data.active} ${stats.data.active === 1 ? "cliente activo" : "clientes activos"}` : "";

  return (
    <>
      <PageHeader
        title="Clientes"
        summary={stats.data ? `${stats.data.total} personas registradas; ${activeLabel} en los últimos 60 días.` : "Cargando tu directorio de clientes…"}
        actions={
          <div className="page-actions">
            <div className="customer-export" ref={exportMenuRef}>
              <button ref={exportButtonRef} type="button" className="secondary-button" onClick={() => setExportMenuOpen(open => !open)} disabled={exporting || !pageData?.totalElements} aria-expanded={exportMenuOpen} aria-controls="customer-export-options">
                <Icon name="download" size={16} />
                {exporting ? "Preparando…" : "Descargar lista"}
              </button>
              {exportMenuOpen && (
                <div id="customer-export-options" className="customer-export-options" aria-label="Formato de descarga">
                  <button type="button" onClick={() => exportCustomers("xlsx")}>Excel (.xlsx)</button>
                  <button type="button" onClick={() => exportCustomers("csv")}>CSV (.csv)</button>
                </div>
              )}
            </div>
            <button type="button" className="primary-button" onClick={() => setDialogOpen(true)}>
              <Icon name="plus" size={16} />
              Agregar cliente
            </button>
          </div>
        }
      />

      <article className="panel activity-panel">
        <PanelHeading title="Directorio de clientes" subtitle="Encuentra a alguien y revisa cómo participa" />
        <div className="section-toolbar">
          <SearchInput value={filters.q} onSearch={value => setFilter("q", value)} label="Buscar clientes por nombre, correo, teléfono, local o distrito" placeholder="Nombre, correo, teléfono o local" />
          <div className="section-toolbar-filters">
            <FilterSelect value={filters.estado} onChange={value => setFilter("estado", value)} options={STATUS_OPTIONS} label="Filtrar por actividad" />
            <FilterSelect value={filters.orden} onChange={value => setFilter("orden", value)} options={SORT_OPTIONS} label="Ordenar clientes" />
          </div>
        </div>
        <div aria-live="polite" aria-busy={customers.loading}>
          {customers.error ? (
            <ErrorState error={customers.error} onRetry={customers.reload} compact />
          ) : !pageData ? (
            <TableSkeleton rows={size > 10 ? 10 : size} />
          ) : pageData.content.length === 0 ? (
            <EmptyState
              message={hasFilters ? "No encontramos clientes para esta búsqueda. Prueba con otro nombre, correo, teléfono o local." : "Aún no tienes clientes. Agrega al primero para empezar tu programa."}
              actionLabel={hasFilters ? "Limpiar filtros" : "Agregar cliente"}
              onAction={hasFilters ? () => setFilters({ q: "", estado: "Todos" }) : () => setDialogOpen(true)}
            />
          ) : (
            <div className={customers.loading ? "is-refreshing" : ""}>
              <CustomerTable customers={pageData.content} />
              <Pagination
                page={pageData.number}
                totalPages={pageData.totalPages}
                totalElements={pageData.totalElements}
                size={pageData.size}
                onPageChange={setPage}
                onSizeChange={setSize}
                itemLabel="clientes"
              />
            </div>
          )}
        </div>
      </article>

      <CustomerDialog open={dialogOpen && Boolean(locations.data)} locations={locations.data || []} onClose={() => setDialogOpen(false)} onCreated={handleCreated} />
    </>
  );
}
