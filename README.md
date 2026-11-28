# Fidegresa · Frontend web

**Fidegresa** es un programa de fidelización digital para restaurantes, cafeterías y comercios locales. Reemplaza las tarjetas físicas de sellos (que se pierden, se olvidan o se falsifican) por **tarjetas digitales** de estampillas, cashback, niveles o gift card, y le da al negocio un panel para conocer a sus clientes y hacerlos volver.

Este repositorio contiene la **aplicación web** (React) del proyecto CS2031 · Desarrollo Basado en Plataformas.

## Entrega · Proyecto 2

| Qué | Enlace |
|---|---|
| Web publicada (Vercel) | https://frontendfidegresa.vercel.app |
| API publicada (Render + Neon, HTTPS) | https://fidegresa-api.onrender.com/api/v1 |
| Repositorio del backend | https://github.com/Jmanolo2004/DBP-repo-finalroad |
| Presentación | [FIDEGRESA_DECK1.pdf](FIDEGRESA_DECK1.pdf) |
| App de caja (Expo Go) | *Enlace de Expo pendiente* |
| Coevaluación | [COEVALUACION.md](COEVALUACION.md) |

Cuenta de prueba: `maria@fidegresa.com` · `Fidegresa2026` (también con el botón **Usar cuenta demo**).

## Equipo y participación

| Integrante | Principales aportes | Participación |
|---|---|---|
| **José Manuel Aguirre Jiménez** | Arquitectura del frontend (React, Vite, React Router), cliente axios con interceptores JWT, hooks y contextos, pantallas de métricas, clientes, tarjetas, ubicaciones y configuración, mapa y audiencias con MapLibre, Google Wallet, app móvil de caja (React Native + Expo), backend y deployment del Proyecto 1 en AWS. | 100 % |
| **Geannyra Cortez** | Rediseño de login y registro, portada con foto, mejoras de las pantallas de métricas, tarjetas y geolocalización, sellos reales en la tarjeta del cliente y correcciones de contraste y errores del panel. | 100 % |
| **Jennifer Patiño** | Diseño de las tarjetas tipo Wallet (estampillas, cashback, niveles y gift card) y de la landing, rediseño visual del panel (tipografía, colores y botones), backend con datos reales (locales, clientes, programas, caja, métricas, reseñas, equipo y geolocalización sobre PostgreSQL, 31 pruebas automáticas), conexión de la web al backend y deployment del Proyecto 2 (Render, Neon y UptimeRobot). | 100 % |

## Stack

| Capa | Tecnología |
| --- | --- |
| Librería de UI | React 19 (componentes funcionales y hooks) |
| Enrutamiento | React Router 7 (`createBrowserRouter`, rutas anidadas, `lazy` + `Suspense`) |
| Cliente HTTP | Axios con instancia centralizada e interceptores |
| Tipado de props | PropTypes |
| Build | Vite |
| Estilos | CSS propio con tokens de diseño (paleta café y crema, tema claro/oscuro) |
| Tipografía de la landing | Bricolage Grotesque e Instrument Sans, servidas con Fontsource |

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
| `VITE_USE_MOCK` | Solo `true` activa el servidor de demostración. Si falta o tiene otro valor, las peticiones van al backend |

Con `VITE_USE_MOCK=true` la app funciona sin backend: un adaptador de Axios (`src/mocks/`) responde con la **misma forma** que la API REST (rutas `/api/v1`, páginas tipo Spring y `ErrorResponseDto`), con latencia, cancelación y códigos HTTP reales (400, 401, 404, 409, 500). Así la demo nunca depende de que el servidor esté encendido. Para conectar el backend real basta con poner `VITE_USE_MOCK=false`.

### Suscripción de demostración

Todos los planes ofrecen las mismas funciones; Emprende permite 2 locales, Crece 5 y Avanza 15, incluidos los pausados. La demo conserva los cinco locales iniciales aunque superen el límite de Emprende y bloquea solo las nuevas altas. En Configuración se puede mejorar consecutivamente a Crece y Avanza mediante una confirmación simulada, sin cobro real.

Las cuentas de un mismo navegador comparten el negocio, sus locales y su plan de demostración. Al registrarse, el plan elegido sustituye el plan compartido; si ya no hay capacidad, se crea la cuenta pero no el local solicitado y se muestra un aviso. Esta gestión de suscripción y los límites solo funcionan en modo demo: para producción faltan la integración de pagos y su validación en el backend.

Desde Configuración se puede eliminar la cuenta de demostración actual tras confirmarlo. Se revocan sus sesiones, pero no se borran el negocio ni los datos compartidos. La eliminación de cuentas reales y las opciones de seguridad mostradas en Configuración requieren implementación en el backend.

## Pantallas

**Públicas:** landing con historia animada por scroll, selector de tarjetas y demo del panel, iniciar sesión, crear cuenta, continuar con Google y con Apple, términos y condiciones, política de privacidad, pantalla de carga, pantalla sin conexión y error 404.

El inicio de sesión muestra únicamente tarjetas de ejemplo de los datos iniciales de la demo; no publica tarjetas de negocios. La pantalla sin conexión aparece cuando el navegador detecta la pérdida de conexión y devuelve al usuario a la pantalla anterior al recuperarla. Los errores de conexión con el servidor se muestran en la pantalla correspondiente.

**Panel (rutas protegidas):**

| Ruta | Sección |
| --- | --- |
| `/panel/metricas` | Métricas y actividad filtrables por programa, periodo y local |
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
│   └── cards/ customers/ reviews/ locations/ geo/ settings/ charts/ public/ landing/
├── pages/
│   ├── public/     Landing, Login, Register, Terms, Privacy, ConnectionError, NotFound
│   └── dashboard/  Metrics, Customers, CustomerDetail, Reviews, Cards, Locations, Geolocation, Settings
├── routes/         router.jsx (configuración centralizada), ProtectedRoute, PublicOnlyRoute
├── mocks/          Servidor de demostración (adaptador de axios + datos)
├── utils/          Formato en soles (es-PE), validadores, geografía, CSV
└── styles/         base.css (sistema visual), components.css y landing.css
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
| GET | `/metrics/profitability?from&to&branchId` | Rentabilidad: ventas de clientes recurrentes, costo de premios y retorno |

## Despliegue

El proyecto incluye `vercel.json` para que las rutas del SPA funcionen al recargar. En Vercel: *Framework preset* Vite, comando `npm run build`, carpeta `dist` y variables `VITE_API_URL` y `VITE_USE_MOCK`.

```bash
npm run build && npm run preview
```
