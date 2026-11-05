import { useOnlineStatus } from "../../hooks/useOnlineStatus";

export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div className="offline-banner" role="status">
      Estás sin conexión. Los cambios no se guardarán hasta que vuelvas a conectarte.
    </div>
  );
}
