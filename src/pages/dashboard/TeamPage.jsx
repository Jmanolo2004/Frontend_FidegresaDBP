import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Avatar } from "../../components/common/Avatar";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { ErrorState } from "../../components/common/ErrorState";
import { Icon } from "../../components/common/Icon";
import { PageHeader } from "../../components/common/PageHeader";
import { SearchInput } from "../../components/common/SearchInput";
import { StatusPill } from "../../components/common/StatusPill";
import { TeamMemberDialog } from "../../components/team/TeamMemberDialog";
import { useAuth } from "../../hooks/useAuth";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useFetch } from "../../hooks/useFetch";
import { useToast } from "../../hooks/useToast";
import { teamService } from "../../services/teamService";
import { normalizeText } from "../../utils/format";

const ROLES = { ADMIN: "Administrador", BRAND_ADMIN: "Administrador", CASHIER: "Trabajador" };

export default function TeamPage() {
  useDocumentTitle("Equipo");
  const { user } = useAuth();
  const { branches, branchesLoading, branchesError, reloadBranches } = useOutletContext();
  const { showError, showToast } = useToast();
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState({ open: false, member: null });
  const [removing, setRemoving] = useState(null);
  const account = user && typeof user === "object" ? user : null;
  const canManage = Boolean(account && ["ADMIN", "BRAND_ADMIN"].includes(account.role));
  const team = useFetch(({ signal }) => teamService.getAll({ signal }), [], { enabled: canManage });
  const name = account?.fullName || account?.email || "Cuenta actual";
  const role = ROLES[account?.role];
  const query = normalizeText(search.trim());
  const matches = (memberName, memberEmail) => normalizeText(`${memberName} ${memberEmail || ""}`).includes(query);
  const accountMatches = matches(name, account?.email);
  const filtered = (team.data || []).filter(member => matches(member.name, member.email));
  const branchName = id => branches.find(branch => branch.id === id)?.nombre || "Local no disponible";
  const available = canManage && !branchesError && branches.length > 0;

  const removeMember = async () => {
    try {
      await teamService.remove(removing.id);
      setRemoving(null);
      showToast("Miembro eliminado del equipo.");
      team.refresh();
    } catch (error) {
      showError(error.message);
    }
  };

  return (
    <>
      <PageHeader
        title="Equipo de tu negocio"
        summary="Consulta la estructura de tu equipo, sus roles y el acceso a los locales."
        actions={
          <div className="page-actions">
            <button type="button" className="primary-button" disabled={!available} aria-describedby="team-availability" onClick={() => setDialog({ open: true, member: null })}>
              <Icon name="plus" size={16} /> Añadir miembro
            </button>
          </div>
        }
      />
      <p className="team-notice" id="team-availability" role="status">
        Registra a las personas de tu equipo y los locales donde atienden. Por ahora no se envían invitaciones por correo.
      </p>
      {!canManage && <p className="team-notice">Solo una cuenta administradora puede gestionar el equipo.</p>}
      {canManage && branchesError && <ErrorState error={branchesError} onRetry={reloadBranches} compact />}
      {canManage && !branchesLoading && !branchesError && !branches.length && <p className="team-notice">Agrega un local para asignarlo a un miembro del equipo.</p>}
      <article className="panel team-panel">
        <div className="section-toolbar team-toolbar">
          <SearchInput value={search} onSearch={setSearch} label="Buscar equipo por nombre o correo" placeholder="Buscar por nombre o correo" />
          {canManage && team.data && <span>{team.data.length} {team.data.length === 1 ? "miembro simulado" : "miembros simulados"}</span>}
        </div>
        {canManage && team.error && <ErrorState error={team.error} onRetry={team.reload} compact />}
        <div className="table-wrap customer-table team-table">
          <table className="data-table">
            <thead>
              <tr><th>Nombre</th><th>Local actual</th><th>Acceso a los locales</th><th>Rol</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {accountMatches && (
                <tr>
                  <td data-label="Nombre"><span className="cell-inline"><Avatar name={name} /><span className="team-account"><strong>{name}</strong>{account?.email && <small>{account.email}</small>}</span><span className="team-you">Tú</span></span></td>
                  <td data-label="Local actual">No disponible</td>
                  <td data-label="Acceso a los locales">No disponible</td>
                  <td data-label="Rol">{role ? <StatusPill>{role}</StatusPill> : "No disponible"}</td>
                  <td data-label="Acciones">Cuenta actual</td>
                </tr>
              )}
              {filtered.map(member => (
                <tr key={member.id}>
                  <td data-label="Nombre"><span className="cell-inline"><Avatar name={member.name} /><span className="team-account"><strong>{member.name}</strong><small>{member.email}</small></span><span className="team-you">Simulado</span></span></td>
                  <td data-label="Local actual">{branchName(member.currentBranchId)}</td>
                  <td data-label="Acceso a los locales">{member.branchIds.map(branchName).join(", ")}</td>
                  <td data-label="Rol"><StatusPill>{member.role}</StatusPill></td>
                  <td data-label="Acciones"><span className="team-actions">
                    <button className="text-button" type="button" disabled={!available} onClick={() => setDialog({ open: true, member })} aria-label={`Editar ${member.name}`}>Editar</button>
                    <button className="text-button" type="button" onClick={() => setRemoving(member)} aria-label={`Eliminar ${member.name}`}>Eliminar</button>
                  </span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {canManage && team.loading && !team.data && <p className="team-empty" role="status">Cargando equipo…</p>}
        {!accountMatches && filtered.length === 0 && !team.loading && !team.error && <p className="team-empty" role="status">No se encontraron miembros para esta búsqueda.</p>}
      </article>
      <TeamMemberDialog open={dialog.open} member={dialog.member} branches={branches} onClose={() => setDialog({ open: false, member: null })} onSaved={() => { setDialog({ open: false, member: null }); team.refresh(); }} />
      <ConfirmDialog open={Boolean(removing)} title="Eliminar miembro" description={`Se eliminará ${removing?.name || "este miembro"} del equipo.`} confirmLabel="Eliminar" onClose={() => setRemoving(null)} onConfirm={removeMember} />
    </>
  );
}
