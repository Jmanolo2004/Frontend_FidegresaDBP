import { useCallback, useEffect, useState } from "react";
import { Link, useLoaderData, useNavigate, useRevalidator } from "react-router-dom";
import PropTypes from "prop-types";
import { ActivityChart } from "../../components/charts/ActivityChart";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { EmptyState } from "../../components/common/EmptyState";
import { ErrorState } from "../../components/common/ErrorState";
import { KpiCard } from "../../components/common/KpiCard";
import { PageHeader } from "../../components/common/PageHeader";
import { Pagination } from "../../components/common/Pagination";
import { Skeleton } from "../../components/common/Skeleton";
import { GeoMap } from "../../components/map/GeoMap";
import { LimaMap } from "../../components/geo/LimaMap";
import { audienceService } from "../../services/audienceService";
import { branchService } from "../../services/branchService";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useFetch } from "../../hooks/useFetch";
import { usePagination } from "../../hooks/usePagination";
import { useToast } from "../../hooks/useToast";
import { formatMoney } from "../../utils/format";

function BranchList({ onLoaded }) {
  const fetchBranches = useCallback(({ signal }) => branchService.getAll({ signal }), []);
  const { data } = useFetch(fetchBranches, []);
  useEffect(() => {
    if (data) onLoaded(data);
  }, [data, onLoaded]);
  return null;
}

BranchList.propTypes = { onLoaded: PropTypes.func.isRequired };

export default function AudienceDetailPage() {
  const data = useLoaderData();
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const { showToast, showError } = useToast();
  const pagination = usePagination();
  const [branches, setBranches] = useState([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  useDocumentTitle(data?.notFound ? "Audiencia no encontrada" : data?.nombre || "Audiencia");

  const mutate = async operation => {
    try {
      await operation();
      revalidator.revalidate();
    } catch (error) {
      showError(error.message);
    }
  };
  if (data?.notFound) {
    return <><PageHeader title="Audiencia no encontrada" /><ErrorState error="No encontramos esta audiencia." onRetry={() => navigate("/panel/geolocalizacion?vista=audiencias")} /></>;
  }
  if (!data) return <><PageHeader title="Audiencia" /><Skeleton height={480} /></>;

  const metrics = data.metricas || {};
  const statusChange = () => mutate(async () => {
    const status = data.estado === "Activa" ? "Pausada" : data.trigger === "scheduled" ? "Programada" : "Activa";
    await audienceService.setStatus(data.id, status);
    showToast(status === "Activa" ? "La audiencia está activa." : status === "Programada" ? "La audiencia quedó programada." : "La audiencia está pausada.");
  });
  const duplicate = () => mutate(async () => {
    const copy = await audienceService.duplicate(data.id);
    showToast("Se creó un borrador duplicado.");
    navigate(`/panel/geolocalizacion/audiencias/${copy.id}/editar`);
  });
  const remove = () => mutate(async () => {
    await audienceService.remove(data.id);
    setDeleteOpen(false);
    showToast("Audiencia eliminada.");
    navigate("/panel/geolocalizacion?vista=audiencias");
  });
  const history = data.historial || [];
  const start = pagination.page * pagination.size;
  const visibleHistory = history.slice(start, start + pagination.size);
  const totalPages = Math.max(1, Math.ceil(history.length / pagination.size));
  const branch = {
    id: Number(data.branchId),
    nombre: data.local,
    distrito: data.district,
    latitud: Number(data.center?.lat ?? data.latitud),
    longitud: Number(data.center?.lng ?? data.longitud),
    mapX: 410,
    mapY: 325
  };
  const triggerDescription = data.trigger === "scheduled"
    ? `Envío programado para ${data.schedule?.date || "la fecha seleccionada"} a las ${data.schedule?.time || "la hora seleccionada"}.`
    : "La notificación se envía desde la aplicación móvil cuando el cliente entra en la zona.";
  const people = (data.clientesAlcanzados || []).map(customer => ({
    ...customer,
    latitud: Number(customer.latitud),
    longitud: Number(customer.longitud),
    distance: Number(customer.distance) || 0
  }));
  const fallbackMap = <div className="geo-map-fallback"><p role="status">Mapa ilustrativo. La audiencia está centrada en {data.local}.</p><LimaMap location={branch} customers={people} radius={Number(data.radius)} onMove={() => {}} onMoveEnd={() => {}} onCenter={() => {}} /></div>;
  const otherBranches = branches.length ? branches : [branch];

  return (
    <>
      <BranchList onLoaded={setBranches} />
      <PageHeader
        title={data.nombre}
        summary={`${data.local} · ${data.zoneType === "district" ? data.district : `${data.radius} m`} · ${data.trigger === "scheduled" ? "Envío programado" : "Al entrar a la zona"}`}
        actions={<div className="audience-detail-actions">
          <Link className="secondary-button" to={`/panel/geolocalizacion/audiencias/${data.id}/editar`}>Editar</Link>
          <button type="button" className="secondary-button" onClick={duplicate}>Duplicar</button>
          <button type="button" className="secondary-button" onClick={statusChange}>{data.estado === "Activa" ? "Pausar" : data.trigger === "scheduled" ? "Activar programación" : "Activar"}</button>
          <button type="button" className="danger-button" onClick={() => setDeleteOpen(true)}>Eliminar</button>
        </div>}
      />
      <div className="audience-detail-state"><span className={`status-pill ${data.estado.toLowerCase()}`}>{data.estado}</span><span>{triggerDescription}</span></div>
      <div className="audience-detail-grid">
        <section className="panel audience-detail-map-panel">
          <h2>Zona y clientes alcanzados</h2>
          <GeoMap
            branch={branch}
            branches={otherBranches}
            customers={people}
            radius={Number(data.radius)}
            district={data.zoneType === "district" ? data.district : undefined}
            onBranchMove={() => {}}
            ariaLabel="Mapa estático de la zona de la audiencia"
            fallback={fallbackMap}
          />
        </section>
        <section className="audience-detail-metrics">
          <KpiCard label="Personas en el segmento" value={metrics.personas || 0} icon="users" />
          <KpiCard label="Avisos enviados" value={metrics.avisosEnviados || 0} icon="bell" />
          <KpiCard label="Avisos abiertos" value={`${metrics.abiertos || 0}%`} icon="chart" />
          <KpiCard label="Visitas atribuidas" value={metrics.visitasAtribuidas || 0} icon="visits" />
          <KpiCard label="Ventas atribuidas" value={formatMoney(metrics.ventasAtribuidas || 0)} icon="chart" />
        </section>
      </div>
      <section className="panel audience-activity-panel">
        <div className="panel-heading"><div><h2>Actividad de la audiencia</h2><p>Visitas atribuidas por día durante los últimos siete días</p></div></div>
        <ActivityChart series={data.actividadDiaria || []} metric="visitas" period="month" />
      </section>
      <section className="panel audience-history-panel">
        <div className="panel-heading"><div><h2>Historial de envíos</h2><p>Notificaciones entregadas y visitas atribuidas</p></div></div>
        {history.length ? <>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Fecha</th><th>Cliente</th><th>Local</th><th>Abrió el aviso</th><th>Volvió en 48 h</th><th>Venta atribuida</th></tr></thead>
              <tbody>{visibleHistory.map(send => <tr key={send.id}>
                <td>{new Date(send.fecha).toLocaleString("es-PE")}</td>
                <td><Link to={`/panel/clientes/${send.clienteId}`}>{send.cliente}</Link></td>
                <td>{send.local}</td>
                <td>{send.abierto ? "Sí" : "No"}</td>
                <td>{send.volvio ? "Sí" : "No"}</td>
                <td>{send.volvio ? formatMoney(send.venta) : "—"}</td>
              </tr>)}</tbody>
            </table>
          </div>
          <Pagination page={pagination.page} totalPages={totalPages} totalElements={history.length} size={pagination.size} onPageChange={pagination.setPage} onSizeChange={pagination.setSize} itemLabel="envíos" />
        </> : <EmptyState message="Aún no hay envíos. Activa la audiencia o envía una prueba para comenzar a ver actividad." />}
      </section>
      <ConfirmDialog open={deleteOpen} title="Eliminar audiencia" description={`¿Quieres eliminar “${data.nombre}”?`} confirmLabel="Eliminar audiencia" onClose={() => setDeleteOpen(false)} onConfirm={remove} />
    </>
  );
}
