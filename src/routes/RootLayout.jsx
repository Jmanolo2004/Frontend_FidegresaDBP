import { Suspense, useEffect, useState } from "react";
import { Outlet, ScrollRestoration } from "react-router-dom";
import { LoadingScreen } from "../components/common/LoadingScreen";
import { ErrorBoundary } from "../components/errors/ErrorBoundary";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import ConnectionErrorPage from "../pages/public/ConnectionErrorPage";

export function RootLayout() {
  const online = useOnlineStatus();
  const [startedOnline, setStartedOnline] = useState(online);

  useEffect(() => {
    if (online) setStartedOnline(true);
  }, [online]);

  return (
    <ErrorBoundary>
      {startedOnline && <div hidden={!online}><Suspense fallback={<LoadingScreen />}><Outlet /></Suspense></div>}
      {!online && <ConnectionErrorPage />}
      <ScrollRestoration />
    </ErrorBoundary>
  );
}
