# Fidegresa Caja — app móvil

App para el cajero de un negocio afiliado a Fidegresa. Escanea con la cámara el código QR de la tarjeta digital del cliente y registra los movimientos de los cuatro tipos de programa:

| Programa | Qué puede hacer el cajero |
|---|---|
| **Estampillas** | Agregar 1 a 5 sellos y canjear el premio cuando la tarjeta está completa |
| **Cashback** | Registrar una compra (suma el % de cashback) y usar el saldo acumulado |
| **Niveles** | Registrar una compra (suma puntos y sube de nivel) |
| **Gift card** | Cobrar un monto con el saldo de la gift card |

Además puede bloquear o reactivar una tarjeta, anular un movimiento reciente y revisar el historial del local.

Hecha con **React Native + Expo (SDK 58)** y **Expo Router**. Consume únicamente el backend de Fidegresa (Spring Boot).

## Cómo correrla

```bash
npm install
cp .env.example .env      # en Windows: copy .env.example .env
```

Edita `.env` y pon la URL de tu backend en `EXPO_PUBLIC_API_URL`. En el celular **no uses `localhost`**: usa la IP de tu PC en la red Wi-Fi (por ejemplo `http://192.168.1.20:8080/api/v1`) o la URL pública del backend desplegado.

```bash
npx expo start
```

Escanea el QR de la terminal con la app **Expo Go** (el celular y la PC deben estar en la misma red).

## Generar el APK

El APK se genera en la nube con EAS (no necesitas Android Studio):

```bash
npm install -g eas-cli
eas login                 # cuenta gratuita de expo.dev
eas build:configure       # solo la primera vez
```

En `eas.json`, perfil `preview`, reemplaza `EXPO_PUBLIC_API_URL` por la URL **pública con HTTPS** de tu backend, y luego:

```bash
npm run build:apk         # = eas build -p android --profile preview
```

Al terminar, EAS muestra un enlace y un QR para descargar e instalar el `.apk` en cualquier Android.

## Estructura

```
src/
  app/            Rutas (Expo Router): login, pestañas y detalle de tarjeta
  screens/        Pantallas: Login, Scanner, Card, History, Profile
  components/     UI reutilizable (botones, campos, estados de carga/error, tarjeta, acciones)
  contexts/       Estado global: AuthContext, BranchContext, ToastContext
  hooks/          useAuth, useAsync, usePaginatedList, useCardActions, useCurrentLocation, useNetworkStatus…
  services/       apiClient (axios + interceptores), servicios por recurso y API externa de geocodificación
  utils/          Formato en soles, validaciones, lectura del QR, distancias, tema visual
```

## Cómo cumple la rúbrica (Mobile)

- **Integración con el backend:** todas las funciones dependen de la API REST. Usa GET, POST, PATCH y DELETE. El JWT se guarda cifrado con **expo-secure-store**. Un interceptor de axios agrega `Authorization: Bearer …` y `Content-Type`, reintenta lecturas ante fallas de red o errores 5xx y cierra la sesión ante un 401. Las operaciones que cambian saldo envían `Idempotency-Key` para que un reintento no duplique el movimiento.
- **Arquitectura:** capas separadas (services → hooks/contexts → screens/components), custom hooks, Context API con `useReducer`, componentes funcionales y nombres en inglés.
- **Sensores y API externa:**
  - **Cámara** (`expo-camera`): lee el QR de la tarjeta, con linterna.
  - **GPS** (`expo-location`): detecta el local más cercano para registrar el movimiento en el local correcto.
  - **Vibración** (`expo-haptics`): confirma cada lectura y cada operación.
  - **API externa:** Photon (OpenStreetMap) traduce las coordenadas del GPS en una dirección legible.
  - **Permisos y respaldos:** mensajes claros al pedir permisos. Sin cámara, el cajero escribe el código; sin GPS, elige el local a mano; si el permiso está bloqueado, la app ofrece abrir Ajustes.
- **Errores y carga:** `try/catch` en todas las llamadas, mensajes amigables por código HTTP (400, 401, 403, 404, 409, 5xx), manejo de red caída y de timeouts, reintentos automáticos y botón "Reintentar", skeletons y spinners, toasts de éxito y error, validación de montos antes de enviar, confirmación antes de mover saldo, estados vacíos y aviso de "sin internet".

## Contrato de API que necesita el backend

Base: `EXPO_PUBLIC_API_URL` (por ejemplo `https://api.fidegresa.com/api/v1`). Todas las rutas, salvo el login, llevan `Authorization: Bearer <token>`. Los errores usan el `ErrorResponseDto` del backend (`{ status, error, message, path }`): el `message` de los 4xx se muestra tal cual al cajero, así que conviene escribirlo en español.

| Método | Ruta | Cuerpo | Respuesta |
|---|---|---|---|
| POST | `/auth/login` | `{ email, password }` | `{ token, type, email }` ✅ ya existe |
| GET | `/auth/me` | — | 200 si el token es válido ✅ ya existe |
| GET | `/branches` | — | `[Branch]` o página de Spring |
| GET | `/cards/qr/{qrToken}` | — | `Card` · 404 si no existe |
| POST | `/cards/{id}/stamps` | `{ branchId, quantity }` | `Card` actualizada |
| POST | `/cards/{id}/redemptions` | `{ branchId, rewardId }` | `Card` actualizada |
| POST | `/cards/{id}/purchases` | `{ branchId, amount }` | `Card` (suma cashback o puntos según el programa) |
| POST | `/cards/{id}/balance-charges` | `{ branchId, amount }` | `Card` (descuenta cashback o gift card) · 409 si no alcanza el saldo |
| PATCH | `/cards/{id}/status` | `{ status: "ACTIVE" \| "BLOCKED" }` | `Card` actualizada |
| GET | `/cards/{id}/transactions?page&size&sort=createdAt,desc` | — | página de `Transaction` |
| GET | `/transactions?branchId&page&size&sort=createdAt,desc` | — | página de `Transaction` |
| DELETE | `/transactions/{id}` | — | 204 (anula un movimiento reciente) |

**Branch**
```json
{ "id": 1, "name": "Café de la Plaza", "address": "Av. Larco 345, Miraflores", "latitude": -12.1219, "longitude": -77.03 }
```

**Card**
```json
{
  "id": 1,
  "qrToken": "FDG-EST-4821",
  "serialNumber": "EST-4821",
  "status": "ACTIVE",
  "programType": "STAMPS",
  "program": {
    "id": 1, "name": "Un café con cariño", "businessName": "Café de la Plaza",
    "requiredStamps": 10,
    "rewards": [{ "id": 9, "name": "Café gratis", "requiredStamps": 10 }],
    "cashbackPercent": 5,
    "pointsPerSol": 1,
    "levels": [{ "number": 1, "name": "Nivel 1", "minPoints": 0, "benefit": "" }]
  },
  "customer": { "id": 1, "fullName": "Camila Torres", "email": "camila@correo.com" },
  "stampBalance": 8,
  "cashbackBalance": 0,
  "points": 0,
  "level": 1,
  "giftBalance": 0,
  "giftInitialAmount": 0,
  "expiresAt": null
}
```
`programType` es `STAMPS`, `CASHBACK`, `LEVELS` o `GIFT_CARD`. Cada tarjeta solo usa los campos de su programa. Los montos van en soles, con 2 decimales.

**Transaction**
```json
{
  "id": 101, "type": "STAMP", "amount": 2, "unit": "STAMPS",
  "createdAt": "2026-11-15T10:20:00Z", "branchName": "Café de la Plaza",
  "customerName": "Camila Torres", "programName": "Un café con cariño", "programType": "STAMPS",
  "cardQrToken": "FDG-EST-4821", "canBeVoided": true
}
```
`type` puede ser `STAMP`, `REDEMPTION`, `CASHBACK_EARNED`, `CASHBACK_USED`, `POINTS_EARNED`, `GIFT_CHARGE`. `unit` puede ser `STAMPS`, `POINTS` o `SOLES`. `canBeVoided` indica si todavía se puede anular (por ejemplo, durante los primeros 10 minutos).

> El backend actual solo tiene `auth`, `businesses`, `customers` y `loyalty-programs`, y su `LoyaltyCard` maneja sellos. Para que la app funcione hay que agregar los endpoints de esta tabla y los campos de cashback, niveles y gift card. Mientras falten, la app inicia sesión, pero al escanear muestra un error amigable.
