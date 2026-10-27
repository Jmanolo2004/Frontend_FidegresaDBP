import { Suspense, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { Icon } from "../common/Icon";
import { LoadingScreen } from "../common/LoadingScreen";
import { PageSkeleton } from "../common/Skeleton";
import { ErrorBoundary } from "../errors/ErrorBoundary";
import { ErrorScreen } from "../errors/ErrorScreen";
import { NoticesDialog } from "../settings/NoticesDialog";
import { ProfileDialog } from "../settings/ProfileDialog";
import { SettingsProvider } from "../../contexts/SettingsContext";
import { useSettings } from "../../hooks/useSettings";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";

function DashboardShell() {
  const { settings, loading, error, reloadSettings, notices } = useSettings();
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [noticesOpen, setNoticesOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  if (loading) return <LoadingScreen />;
  if (error || !settings) {
    return (
      <ErrorScreen
        code={error?.isNetworkError ? "SIN CONEXIÓN" : "ERROR"}
        title="No pudimos abrir tu panel"
        description={error?.message || "Inténtalo nuevamente en unos segundos."}
        primaryLabel="Reintentar conexión"
        onPrimary={() => reloadSettings()}
        secondaryLabel="Volver al inicio de sesión"
        onSecondary={() => logout().then(() => navigate("/login"))}
      />
    );
  }

  const handleLogout = async () => {
    await logout();
    showToast("Cerraste sesión correctamente.");
    navigate("/login", { replace: true });
  };

  const profileName = settings.perfilNombre || user?.fullName || "Tu cuenta";

  return (
    <div className="app-shell">
      <Sidebar
        open={sidebarOpen}
        profileName={profileName}
        onNavigate={() => setSidebarOpen(false)}
        onOpenProfile={() => setProfileOpen(true)}
        onLogout={handleLogout}
      />
      {sidebarOpen && <button type="button" className="sidebar-backdrop" aria-label="Cerrar menú" onClick={() => setSidebarOpen(false)} />}
      <main className="main-area">
        <Topbar
          profileName={profileName}
          noticeCount={notices.length}
          menuOpen={sidebarOpen}
          onToggleMenu={() => setSidebarOpen(value => !value)}
          onOpenNotices={() => setNoticesOpen(true)}
          onOpenProfile={() => setProfileOpen(true)}
        />
        <section className="page-content">
          <ErrorBoundary inline resetKey={location.pathname}>
            <Suspense fallback={<PageSkeleton />}>
              <Outlet context={{ openProfile: () => setProfileOpen(true) }} />
            </Suspense>
          </ErrorBoundary>
        </section>
        <footer className="footer">
          <span>© {new Date().getFullYear()} Fidegresa</span>
          <span>
            Hecho para los negocios de tu comunidad
            <b>
              <Icon name="star" size={12} />
            </b>
          </span>
        </footer>
      </main>
      <NoticesDialog open={noticesOpen} notices={notices} onClose={() => setNoticesOpen(false)} />
      <ProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}

export function DashboardLayout() {
  return (
    <SettingsProvider>
      <DashboardShell />
    </SettingsProvider>
  );
}
