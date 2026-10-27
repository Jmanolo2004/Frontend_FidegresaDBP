import { Suspense } from "react";
import { Outlet, ScrollRestoration } from "react-router-dom";
import { LoadingScreen } from "../components/common/LoadingScreen";
import { ErrorBoundary } from "../components/errors/ErrorBoundary";

export function RootLayout() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingScreen />}>
        <Outlet />
      </Suspense>
      <ScrollRestoration />
    </ErrorBoundary>
  );
}
