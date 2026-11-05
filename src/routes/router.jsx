import { lazy } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { RootLayout } from "./RootLayout";
import { RouteErrorScreen } from "./RouteErrorScreen";
import { ProtectedRoute } from "./ProtectedRoute";
import { PublicOnlyRoute } from "./PublicOnlyRoute";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { tokenStorage } from "../api/tokenStorage";
import { loyaltyProgramService } from "../services/loyaltyProgramService";
import { audienceService } from "../services/audienceService";

// Cada pantalla se descarga solo cuando se visita (code splitting con React.lazy).
const LandingPage = lazy(() => import("../pages/public/LandingPage"));
const LoginPage = lazy(() => import("../pages/public/LoginPage"));
const RegisterPage = lazy(() => import("../pages/public/RegisterPage"));
const TermsPage = lazy(() => import("../pages/public/TermsPage"));
const PrivacyPage = lazy(() => import("../pages/public/PrivacyPage"));
const ConnectionErrorPage = lazy(() => import("../pages/public/ConnectionErrorPage"));
const NotFoundPage = lazy(() => import("../pages/public/NotFoundPage"));

const MetricsPage = lazy(() => import("../pages/dashboard/MetricsPage"));
const CustomersPage = lazy(() => import("../pages/dashboard/CustomersPage"));
const CustomerDetailPage = lazy(() => import("../pages/dashboard/CustomerDetailPage"));
const ReviewsPage = lazy(() => import("../pages/dashboard/ReviewsPage"));
const CardsPage = lazy(() => import("../pages/dashboard/CardsPage"));
const CardWizardPage = lazy(() => import("../pages/dashboard/CardWizardPage"));
const CardDetailPage = lazy(() => import("../pages/dashboard/CardDetailPage"));
const LocationsPage = lazy(() => import("../pages/dashboard/LocationsPage"));
const GeolocationPage = lazy(() => import("../pages/dashboard/GeolocationPage"));
const AudienceWizardPage = lazy(() => import("../pages/dashboard/AudienceWizardPage"));
const AudienceDetailPage = lazy(() => import("../pages/dashboard/AudienceDetailPage"));
const SettingsPage = lazy(() => import("../pages/dashboard/SettingsPage"));

export const ROUTES = {
  home: "/",
  login: "/login",
  register: "/registro",
  terms: "/terminos",
  privacy: "/privacidad",
  connectionError: "/sin-conexion",
  dashboard: "/panel/metricas"
};

async function loadCard({ params, request }) {
  if (!tokenStorage.getAccessToken()) return null;
  try {
    return await loyaltyProgramService.getById(params.programId, { signal: request.signal });
  } catch (error) {
    if (error.status === 404) return { notFound: true };
    throw error;
  }
}

async function loadAudience({ params, request }) {
  if (!params.audienceId) return null;
  if (!tokenStorage.getAccessToken()) return null;
  try {
    return await audienceService.getById(params.audienceId, { signal: request.signal });
  } catch (error) {
    if (error.status === 404) return { notFound: true };
    throw error;
  }
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteErrorScreen />,
    children: [
      { path: ROUTES.home, element: <LandingPage /> },
      { path: ROUTES.terms, element: <TermsPage /> },
      { path: ROUTES.privacy, element: <PrivacyPage /> },
      { path: ROUTES.connectionError, element: <ConnectionErrorPage /> },
      {
        element: <PublicOnlyRoute />,
        children: [
          { path: ROUTES.login, element: <LoginPage /> },
          { path: ROUTES.register, element: <RegisterPage /> }
        ]
      },
      {
        path: "/panel",
        element: <ProtectedRoute />,
        children: [
          {
            element: <DashboardLayout />,
            children: [
              { index: true, element: <Navigate to="metricas" replace /> },
              { path: "metricas", element: <MetricsPage />, handle: { crumb: "Métricas" } },
              {
                path: "clientes",
                handle: { crumb: "Clientes" },
                children: [
                  { index: true, element: <CustomersPage /> },
                  { path: ":customerId", element: <CustomerDetailPage />, handle: { crumb: params => `Cliente #${params.customerId}` } }
                ]
              },
              { path: "resenas", element: <ReviewsPage />, handle: { crumb: "Reseñas" } },
              {
                path: "tarjetas",
                handle: { crumb: "Tarjetas" },
                children: [
                  { index: true, element: <CardsPage /> },
                  { path: "nueva", element: <CardWizardPage />, handle: { crumb: "Nueva tarjeta" } },
                  { path: ":programId", loader: loadCard, element: <CardDetailPage />, handle: { crumb: (_, data) => data?.nombre || "Tarjeta" } },
                  { path: ":programId/editar", loader: loadCard, element: <CardWizardPage />, handle: { crumb: (_, data) => data?.nombre ? `Editar ${data.nombre}` : "Editar tarjeta" } }
                ]
              },
              { path: "ubicaciones", element: <LocationsPage />, handle: { crumb: "Ubicaciones" } },
              {
                path: "geolocalizacion",
                handle: { crumb: "Geolocalización" },
                children: [
                  { index: true, element: <GeolocationPage /> },
                  {
                    path: "audiencias",
                    handle: { crumb: "Audiencias" },
                    children: [
                      { path: "nueva", loader: loadAudience, element: <AudienceWizardPage />, handle: { crumb: "Nueva audiencia" } },
                      { path: ":audienceId", loader: loadAudience, element: <AudienceDetailPage />, handle: { crumb: (_, data) => data?.nombre || "Audiencia" } },
                      { path: ":audienceId/editar", loader: loadAudience, element: <AudienceWizardPage />, handle: { crumb: (_, data) => data?.nombre ? `Editar ${data.nombre}` : "Editar audiencia" } }
                    ]
                  }
                ]
              },
              { path: "configuracion", element: <SettingsPage />, handle: { crumb: "Configuración" } },
              { path: "*", element: <NotFoundPage embedded />, handle: { crumb: "No encontrado" } }
            ]
          }
        ]
      },
      { path: "*", element: <NotFoundPage /> }
    ]
  }
]);
