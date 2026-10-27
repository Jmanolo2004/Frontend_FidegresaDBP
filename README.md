# Fidegresa · Frontend web

**Fidegresa** es un programa de fidelización digital para restaurantes, cafeterías y comercios locales. Reemplaza las tarjetas físicas de sellos (que se pierden, se olvidan o se falsifican) por **tarjetas digitales** de estampillas, cashback, niveles o gift card, y le da al negocio un panel para conocer a sus clientes y hacerlos volver.

Este repositorio contiene la **aplicación web** (React) del proyecto CS2031 · Desarrollo Basado en Plataformas.

## Stack

| Capa | Tecnología |
| --- | --- |
| Librería de UI | React 19 (componentes funcionales y hooks) |
| Enrutamiento | React Router 7 (`createBrowserRouter`, rutas anidadas, `lazy` + `Suspense`) |
| Cliente HTTP | Axios con instancia centralizada e interceptores |
| Tipado de props | PropTypes |
| Build | Vite |
| Estilos | CSS propio con tokens de diseño (paleta café y crema, tema claro/oscuro) |

## Cómo ejecutarlo

```bash
npm install
cp .env.example .env      # en Windows: copy .env.example .env
npm run dev               # http://localhost:5173
```

Cuenta de demostración: `maria@fidegresa.com` · `Fidegresa2026` (en el login también está el botón **Usar cuenta demo**).

### Variables de entorno

| Variable | Descripción |
| --- | --- |
| `VITE_API_URL` | URL base del backend, por ejemplo `https://api.midominio.com/api/v1` |
| `VITE_USE_MOCK` | `true` usa el servidor de demostración integrado; `false` envía todas las peticiones al backend |

Con `VITE_USE_MOCK=true` la app funciona sin backend: un adaptador de Axios (`src/mocks/`) responde con la **misma forma** que la API REST (rutas `/api/v1`, páginas tipo Spring y `ErrorResponseDto`), con latencia, cancelación y códigos HTTP reales (400, 401, 404, 409, 500). Así la demo nunca depende de que el servidor esté encendido. Para conectar el backend real basta con poner `VITE_USE_MOCK=false`.

## Pantallas

**Públicas:** página informativa (landing), iniciar sesión, crear cuenta, continuar con Google y con Apple, términos y condiciones, política de privacidad, pantalla de carga, pantalla sin conexión y error 404.

**Panel (rutas protegidas):**

| Ruta | Sección |
| --- | --- |
| `/panel/metricas` | Ventas, clientes activos, premios y retorno; gráfico por periodo |
| `/panel/clientes` | Directorio paginado con búsqueda, filtros, orden, exportación CSV y alta de clientes |
| `/panel/clientes/:customerId` | Detalle del cliente: contacto, tarjeta digital, visitas y reseñas |
| `/panel/resenas` | Calificación promedio, filtros y respuestas a reseñas (paginado) |
| `/panel/tarjetas` | Diseñador de tarjetas digitales con vista previa en vivo |
| `/panel/ubicaciones` | Locales del negocio: alta, edición y pausa |
| `/panel/geolocalizacion` | Mapa de Lima con radio de alcance y creación de audiencias |
| `/panel/configuracion` | Programa, tema claro/oscuro, perfil, locales y avisos |

## Estructura

```
src/
├── api/            apiClient (axios), interceptores JWT, manejo de errores, almacenamiento del token
├── services/       Un servicio por recurso: auth, customers, reviews, loyalty-programs, branches, geo, settings, metrics
├── contexts/       AuthContext, SettingsContext, ToastContext
├── hooks/          useAuth, useFetch, useForm, usePagination, useDebounce, useSettings, useToast, useDocumentTitle
├── components/
│   ├── common/     Icon, Modal, ConfirmDialog, FormField, Pagination, SearchInput, KpiCard, Skeleton, ErrorState…
│   ├── layout/     DashboardLayout, Sidebar, Topbar, Breadcrumbs
│   ├── auth/       AuthLayout, SocialAuthButtons, PasswordInput
│   ├── errors/     ErrorBoundary, ErrorScreen
│   └── cards/ customers/ reviews/ locations/ geo/ settings/ charts/ public/
├── pages/
│   ├── public/     Landing, Login, Register, Terms, Privacy, ConnectionError, NotFound
│   └── dashboard/  Metrics, Customers, CustomerDetail, Reviews, Cards, Locations, Geolocation, Settings
├── routes/         router.jsx (configuración centralizada), ProtectedRoute, PublicOnlyRoute
├── mocks/          Servidor de demostración (adaptador de axios + datos)
├── utils/          Formato en soles (es-PE), validadores, geografía, CSV
└── styles/         base.css (sistema visual) y components.css
```

## Cómo cubre la rúbrica (Web)

**Integración con backend.**
- `src/api/apiClient.js` define una instancia de axios con `baseURL` desde `.env`, headers por defecto y timeout.
- Un interceptor de request agrega `Authorization: Bearer <token>`.
- Los interceptores de response intentan renovar el token ante un 401 (con una sola renovación en curso). Si no lo logran, cierran la sesión.
- También reintentan con espera exponencial los GET que fallan por red o por un error 5xx, y normalizan todos los errores a mensajes amigables.
- Se usan GET, POST, PUT, PATCH y DELETE.
- `useFetch` cancela las peticiones con `AbortController` al desmontar o al cambiar los filtros.
- El token vive en memoria y en `sessionStorage`, no en `localStorage`.

**Componentes y arquitectura.**
- Más de 30 componentes reutilizables, separados en presentacionales (`components/`) y contenedores (`pages/`).
- Custom hooks y Context API para el estado global.
- Props validadas con PropTypes.
- Nombres de código en inglés.

**Routing.**
- La configuración está centralizada en `routes/router.jsx`.
- Rutas dinámicas (`/panel/clientes/:customerId`) y query params (`?page=2&size=25&q=lucia&estado=Activa`, `?periodo=year`).
- `ProtectedRoute` y `PublicOnlyRoute` controlan el acceso.
- Cada pantalla se carga con `React.lazy` y `Suspense`.
- Navegación programática con `useNavigate`, breadcrumbs desde `handle.crumb` y páginas 404 pública y dentro del panel.

**Errores, carga y validaciones.**
- `ErrorBoundary` global y otro por sección, más un `errorElement` por ruta.
- Mensajes diferenciados por código HTTP (400, 401, 403, 404, 409, 500).
- Skeletons, spinners y pantalla de carga.
- `useForm` valida en tiempo real.
- Toasts de éxito y error, y confirmación antes de acciones destructivas.
- Los botones se deshabilitan durante el envío para evitar el doble submit.
- Estados vacíos con llamada a la acción, y reintento manual y automático.

**UI/UX.**
- Diseño responsive con tema oscuro.
- Búsqueda con debounce, filtros y ordenamiento.
- Etiquetas, ayudas y errores accesibles (`aria-invalid`, `aria-describedby`).
- Navegación por teclado, incluido el pin del mapa.

**Paginación.**
- Clientes y Reseñas consumen respuestas `{ content, totalElements, totalPages, number, size }`.
- Controles anterior/siguiente y números de página, más el texto "Mostrando X–Y de Z".
- Tamaño de página configurable (10, 25, 50 o 100) y estado guardado en la URL.

## Contrato de API que consume el frontend

Base: `/api/v1`. Las rutas marcadas con ✅ ya existen en el backend (`DBP-repo-finalroad`). Las demás deben implementarse para usar `VITE_USE_MOCK=false`; el servidor de demostración en `src/mocks/handlers/` sirve como referencia exacta de la forma de cada respuesta.

| Método | Ruta | Uso |
| --- | --- | --- |
| POST | `/auth/login` ✅ | Login → `{ token, type, email }` |
| POST | `/auth/register` ✅ | Registro (el frontend envía también datos del negocio) |
| GET | `/auth/me` ✅ | Perfil del usuario autenticado (hoy devuelve texto; se espera JSON) |
| POST | `/auth/refresh`, `/auth/logout`, `/auth/oauth/{google\|apple}` | Renovar sesión, cerrar sesión, acceso social |
| GET | `/customers?page&size&search&status&sort` ✅* | Lista paginada (*hoy existe sin paginar) |
| GET | `/customers/stats`, `/customers/{id}` | Indicadores y detalle |
| POST | `/customers` ✅ | Alta de cliente |
| GET / POST / PUT / DELETE | `/loyalty-programs` ✅* | Tarjetas (*hoy existen GET y POST) |
| GET / PATCH | `/reviews?page&size&sentiment&reply`, `/reviews/summary`, `/reviews/{id}/reply` | Reseñas |
| GET / POST / PUT / PATCH | `/branches`, `/branches/{id}`, `/branches/{id}/status`, `/branches/{id}/position` | Locales |
| GET / PATCH / POST | `/geo/customers`, `/geo/settings`, `/geo/audiences` | Geolocalización |
| GET / PATCH / POST | `/settings`, `/settings/reset`, `/notices`, `/metrics?period&metric` | Configuración, avisos y métricas |

## Despliegue

El proyecto incluye `vercel.json` para que las rutas del SPA funcionen al recargar. En Vercel: *Framework preset* Vite, comando `npm run build`, carpeta `dist` y variables `VITE_API_URL` y `VITE_USE_MOCK`.

```bash
npm run build && npm run preview
```
