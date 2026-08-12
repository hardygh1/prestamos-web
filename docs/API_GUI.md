# Guía de la API — ms-credits (Sistema de Gestión de Préstamos)

Guía de referencia para consumir esta API desde un frontend (pensada para Angular, pero aplicable a cualquier cliente HTTP). Cubre los 20 endpoints del sistema, el formato de respuesta, autenticación JWT, manejo de errores, y modelos TypeScript listos para copiar.

> **v2 — catálogo de parámetros:** los "estados" y el "tipo de documento" que antes viajaban como texto plano ahora son un catálogo normalizado (tabla `parametros`). Los requests que antes recibían un string libre ahora reciben un `id` (ej. `tipoDocumentoId`), y los responses que antes mostraban solo el string ahora traen el par `{id, descripción}` (ej. `estadoId` + `estadoDesc`). Ver sección 6.12 para el nuevo endpoint de catálogo.
>
> **V1.1 — Gestión de Clientes:** `GET /clientes` ahora es paginado y filtrable (**cambio de contrato**, ver sección 6.4), y se agregaron `GET /clientes/{id}`, `PUT /clientes/{id}` y `PATCH /clientes/{id}/estado` (secciones 6.13–6.15).
>
> **V1.2 — Cotizador de Préstamos:** nuevo módulo `Cotizaciones` — simular un préstamo antes de aprobarlo. Ver secciones 6.16–6.20 y el flujo recomendado en la sección 7.

> Documentación interactiva equivalente (Swagger UI): `http://localhost:8080/swagger-ui/index.html` — útil para probar endpoints a mano, pero esta guía es la referencia completa con ejemplos reales y notas de integración.

---

## 1. Configuración base

| | |
|---|---|
| **Base URL (desarrollo)** | `http://localhost:8080` |
| **Content-Type** | `application/json` en todos los requests con body |
| **Autenticación** | JWT Bearer (`Authorization: Bearer <token>`) |
| **Codificación** | UTF-8 en toda la API (mensajes en español con tildes/ñ) |

No hay `server.port` ni `context-path` configurados, así que las rutas son exactamente las que aparecen en esta guía, sin prefijo adicional (ej. `POST http://localhost:8080/auth/login`, no `/api/auth/login`).

```typescript
// environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080'
};
```

### ⚠️ CORS — pendiente de configurar en el backend

El backend **no tiene CORS habilitado actualmente** (no hay ningún `CorsConfigurationSource`/`@CrossOrigin` en el código). Si Angular corre en otro puerto (ej. `http://localhost:4200` con `ng serve`), el navegador bloqueará las peticiones con un error de CORS aunque el backend responda bien.

Opciones mientras tanto:
- **Recomendado para desarrollo**: usar un proxy de Angular (`proxy.conf.json` apuntando a `http://localhost:8080`) para que el navegador vea todo como same-origin.
- **Definitivo**: pedir que se agregue un bean `CorsConfigurationSource` en el backend permitiendo el origen del frontend. Avisar si se necesita esto implementado.

---

## 2. Formato estándar de respuesta

Toda respuesta (éxito o error) tiene exactamente esta forma:

```typescript
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
}
```

- Éxito: `success: true`, `data` con el payload (objeto, array, o `null` si el endpoint no devuelve nada relevante).
- Error: `success: false`, `data: null` siempre, `message` con el motivo en español, listo para mostrar al usuario.

No hay ningún endpoint que devuelva un objeto "suelto" fuera de este envelope — siempre desestructurar `data` de la respuesta.

---

## 3. Autenticación

### Flujo

1. `POST /auth/register` o `POST /auth/login` → devuelven `{ token, usuarioId, nombre, correo, rol }`.
2. Guardar `token` (ej. `localStorage`).
3. En **todas** las demás peticiones, mandar el header:
   ```
   Authorization: Bearer <token>
   ```
4. El token expira en 1 hora (`jwt.expiration-ms=3600000` por defecto en el backend). No hay endpoint de refresh — al expirar, el usuario debe volver a hacer login (esto es una decisión explícita del MVP: no se implementa refresh token).

### Interceptor Angular (adjuntar token automáticamente)

```typescript
// auth.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('token');
  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }
  return next(req);
};
```

```typescript
// error.interceptor.ts — redirigir a login si el token expiró o es inválido
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  return next(req).pipe(
    catchError((err) => {
      if (err.status === 401) {
        localStorage.removeItem('token');
        router.navigate(['/login']);
      }
      return throwError(() => err);
    })
  );
};
```

### Endpoints públicos vs protegidos

Solo `POST /auth/register` y `POST /auth/login` son públicos. **Los otros 18 endpoints exigen el header `Authorization`** — si falta o el token es inválido/expirado, la API responde **401** con el mismo formato `ApiResponse` (ver sección 4), sin llegar siquiera al controller.

---

## 4. Manejo de errores

### Códigos HTTP usados

| Código | Cuándo ocurre |
|---|---|
| **200** | Operación de lectura/actualización exitosa (`GET`, `PUT`, `PATCH`, y también `DELETE /cotizaciones/{id}` — es un soft-delete que devuelve el recurso actualizado, no un `204`) |
| **201** | Creación exitosa (`POST /auth/register`, `POST /clientes`, `POST /prestamos`, `POST /prestamos/{id}/pagos`, `POST /cotizaciones`) |
| **400** | Validación de campos fallida, o violación de una regla de negocio (duplicados, montos que no coinciden, estado inválido, etc.) |
| **401** | Falta el header `Authorization`, el token es inválido/expiró, o las credenciales de login son incorrectas |
| **403** | Token válido pero sin permiso para el recurso (no usado activamente en el MVP actual, no hay roles restringidos por endpoint) |
| **404** | El recurso referenciado (cliente, préstamo) no existe |
| **500** | Error inesperado del servidor |

### Forma de un error de validación (400)

Cuando falla `@Valid` sobre el body, el `message` junta **todos** los campos con error, separados por `; `, en formato `campo: motivo`:

```json
{
  "success": false,
  "message": "correo: El correo no tiene un formato válido; password: La contraseña es obligatoria",
  "data": null
}
```

→ Si el frontend quiere mapear errores por campo (para mostrarlos junto a cada input), puede hacer `message.split('; ').map(s => s.split(': '))` para obtener pares `[campo, motivo]`. Los nombres de campo son los mismos que las propiedades del JSON enviado (camelCase, ej. `correo`, `password`, `clienteId`, `montoPagado`).

### Forma de un error de negocio (400/404)

Un solo mensaje directo, sin prefijo de campo — pensado para mostrarse tal cual (ej. en un toast):

```json
{
  "success": false,
  "message": "El monto pagado debe ser igual al monto de la cuota pendiente",
  "data": null
}
```

### Forma de un 401 (sin token / token inválido / credenciales incorrectas)

```json
{
  "success": false,
  "message": "Credenciales inválidas o token no proporcionado",
  "data": null
}
```

Nota: por seguridad, un login con correo inexistente y un login con contraseña incorrecta devuelven **el mismo mensaje genérico** de arriba (no se revela cuál de los dos falló).

### Mensajes de negocio posibles (por si el frontend quiere manejarlos como casos especiales en vez de mostrarlos genéricamente)

| Mensaje exacto | Cuándo | Endpoint(s) |
|---|---|---|
| `El correo ya se encuentra registrado` | Correo duplicado al registrar usuario | `POST /auth/register` |
| `El documento ya se encuentra registrado` | Ya existe un cliente con esa combinación `tipoDocumentoId` + `numeroDocumento` (el mismo número con otro tipo de documento sí se permite) | `POST /clientes` |
| `El tipo de documento indicado no existe` | `tipoDocumentoId` no existe en el catálogo, o el id enviado pertenece a otro `tipo` (ej. un id de `ST`) | `POST /clientes` |
| `Cliente no encontrado` | `clienteId` no existe | `POST /prestamos` |
| `Préstamo no encontrado` | `id` de préstamo no existe | `GET /prestamos/{id}`, `PATCH /prestamos/{id}/aprobar`, `GET /prestamos/{id}/cuotas`, `POST\|GET /prestamos/{id}/pagos` |
| `El préstamo no se encuentra en estado PENDIENTE` | Se intenta aprobar un préstamo ya `APROBADO` | `PATCH /prestamos/{id}/aprobar` |
| `El préstamo debe estar aprobado para registrar pagos` | Se intenta pagar un préstamo aún `PENDIENTE` | `POST /prestamos/{id}/pagos` |
| `El préstamo no tiene cuotas pendientes de pago` | Todas las cuotas ya están `PAGADO` | `POST /prestamos/{id}/pagos` |
| `El monto pagado debe ser igual al monto de la cuota pendiente` | `montoPagado` no coincide exacto con la cuota a pagar | `POST /prestamos/{id}/pagos` |
| `El estado indicado no existe` | `estadoId` no existe en el catálogo, o pertenece a otro `tipo` | `PATCH /clientes/{id}/estado` |
| `Cotización no encontrada` | `id` de cotización no existe | `GET /cotizaciones/{id}`, `PATCH /cotizaciones/{id}/aprobar`, `DELETE /cotizaciones/{id}` |
| `La cotización ya fue aprobada` | Se intenta aprobar una cotización que ya está `APROBADO` | `PATCH /cotizaciones/{id}/aprobar` |
| `La cotización fue eliminada y no puede aprobarse` | Se intenta aprobar una cotización `ANULADO` | `PATCH /cotizaciones/{id}/aprobar` |
| `No se puede eliminar una cotización ya aprobada` | Se intenta eliminar (`DELETE`) una cotización `APROBADO` | `DELETE /cotizaciones/{id}` |
| `La cotización ya se encuentra eliminada` | Se intenta eliminar una cotización que ya está `ANULADO` | `DELETE /cotizaciones/{id}` |

---

## 5. Modelos TypeScript (copiar/pegar)

```typescript
// ---- Envelope estándar ----
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
}

// ---- Paginación (usado por GET /clientes) ----
export interface PageResponse<T> {
  content: T[];
  page: number;          // página actual, 0-indexed
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

// ---- Auth ----
export interface RegisterRequest {
  nombre: string;
  correo: string;
  password: string;
  rol: string;
}

export interface LoginRequest {
  correo: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  usuarioId: number;
  nombre: string;
  correo: string;
  rol: string;
}

// ---- Parametros (catálogo) ----
export interface ParametroResponse {
  parametroId: number;
  tipo: string;       // 'ST' (estados) | 'TDOC' (tipo de documento)
  codigo: string;      // valor corto/abreviado, ej. 'DNI', 'APR' — usar como valor estable en lógica de negocio si hiciera falta
  descripcion: string; // texto completo legible, ej. 'DNI', 'APROBADO' — usar para mostrar al usuario
}

// ---- Clientes ----
export interface ClienteRequest {
  tipoDocumentoId: number;   // id de un Parametro con tipo='TDOC' (obtener de GET /parametros?tipo=TDOC)
  numeroDocumento: string;
  nombres: string;
  apellidos: string;
  telefono?: string;
  direccion?: string;
  correo?: string;
}

export interface ClienteResponse {
  clienteId: number;
  tipoDocumentoId: number;
  tipoDocumentoDesc: string;   // ej. 'DNI'
  numeroDocumento: string;
  nombres: string;
  apellidos: string;
  telefono: string | null;
  direccion: string | null;
  correo: string | null;
  estadoId: number;
  estadoDesc: string;           // ej. 'ACTIVO'
  fechaRegistro: string;   // ISO LocalDateTime, ej. "2026-07-27T03:08:38.210151"
}

export interface ClienteEstadoRequest {
  estadoId: number;   // id de un Parametro con tipo='ST' (obtener de GET /parametros?tipo=ST)
}

// ---- Préstamos ----
export interface PrestamoRequest {
  clienteId: number;
  monto: number;
  tasaInteres: number;   // ANUAL, no mensual (el backend hace la conversión)
  plazoMeses: number;
}

export interface PrestamoResponse {
  prestamoId: number;
  clienteId: number;
  cotizacionId: number;
  monto: number;
  tasaInteres: number;
  plazoMeses: number;
  cuotaMensual: number;
  totalInteres: number;
  totalPagar: number;
  estadoId: number;
  estadoDesc: 'PENDIENTE' | 'APROBADO';
  fechaAprobacion: string | null;  // ISO LocalDateTime
  fechaDesembolso: string | null;  // ISO LocalDate (no se setea automáticamente en el MVP)
}

export interface DetalleCuotaResponse {
  numeroCuota: number;
  fechaPago: string;   // ISO LocalDate, ej. "2026-08-27"
  capital: number;
  interes: number;
  cuota: number;
  saldo: number;
}

export interface PrestamoDetalleResponse extends PrestamoResponse {
  cronograma: DetalleCuotaResponse[];  // cronograma PROYECTADO (de la cotización, no las cuotas reales)
}

// ---- Cuotas ----
export interface CuotaResponse {
  cuotaId: number;
  prestamoId: number;
  numeroCuota: number;
  fechaVencimiento: string;   // ISO LocalDate
  capital: number;
  interes: number;
  monto: number;
  saldo: number;
  estadoId: number;
  estadoDesc: 'PENDIENTE' | 'PAGADO';
}

// ---- Pagos ----
export interface PagoRequest {
  montoPagado: number;
  metodoPago: string;   // valor libre, ej. "EFECTIVO", "TRANSFERENCIA"
}

export interface PagoResponse {
  pagoId: number;
  cuotaId: number;
  prestamoId: number;
  numeroCuota: number;
  fechaPago: string;   // ISO LocalDateTime
  montoPagado: number;
  metodoPago: string;
}

// ---- Cotizaciones ----
export interface CotizacionRequest {
  clienteId: number;
  monto: number;
  tasaInteres: number;   // ANUAL, igual que en PrestamoRequest
  plazoMeses: number;
}

export interface CotizacionResponse {
  cotizacionId: number;
  clienteId: number;
  monto: number;
  tasaInteres: number;
  plazoMeses: number;
  cuotaMensual: number;
  totalInteres: number;
  totalPagar: number;
  estadoId: number;
  estadoDesc: 'PENDIENTE' | 'APROBADO' | 'ANULADO';
  fechaRegistro: string;   // ISO LocalDateTime
}

export interface CotizacionDetalleResponse extends CotizacionResponse {
  cronograma: DetalleCuotaResponse[];
}
```

**Notas sobre tipos:**
- Todos los montos (`monto`, `tasaInteres`, `cuotaMensual`, `capital`, `interes`, `cuota`, `saldo`, `montoPagado`, etc.) viajan como **número JSON**, no como string — Angular los recibe directo como `number`.
- Las fechas viajan como **string ISO sin zona horaria** (`LocalDate` → `"yyyy-MM-dd"`, `LocalDateTime` → `"yyyy-MM-ddTHH:mm:ss[.SSSSSS]"`). No traen `Z` ni offset — al hacer `new Date(fechaString)` en el navegador se interpretará en la zona horaria local del cliente, lo cual puede diferir de la del servidor. Si se necesita precisión exacta, formatear como texto en vez de convertir a `Date`.

---

## 6. Referencia de endpoints

### 6.1 `POST /auth/register` — Registrar usuario

🔓 Público.

**Body:**

| Campo | Tipo | Requerido | Validación |
|---|---|---|---|
| `nombre` | string | Sí | no vacío |
| `correo` | string | Sí | no vacío, formato email válido, único |
| `password` | string | Sí | 6–100 caracteres |
| `rol` | string | Sí | no vacío (valor libre, no hay enum fijo en backend — ej. `"ADMIN"`) |

```json
// Request
{ "nombre": "Admin QA", "correo": "admin@test.com", "password": "Secreto123", "rol": "ADMIN" }
```

**201 Created:**
```json
{
  "success": true,
  "message": "Usuario registrado correctamente",
  "data": {
    "token": "eyJhbGciOiJIUzM4NCJ9...",
    "usuarioId": 1,
    "nombre": "Admin QA",
    "correo": "admin@test.com",
    "rol": "ADMIN"
  }
}
```

El registro ya devuelve un token JWT usable inmediatamente — no hace falta llamar a `/auth/login` después de registrarse.

**Errores:** 400 validación, 400 `El correo ya se encuentra registrado`.

---

### 6.2 `POST /auth/login` — Iniciar sesión

🔓 Público.

**Body:**

| Campo | Tipo | Requerido | Validación |
|---|---|---|---|
| `correo` | string | Sí | formato email válido |
| `password` | string | Sí | no vacío |

**200 OK:** mismo shape que `AuthResponse` (ver 6.1), con `message: "Inicio de sesión exitoso"`.

**Errores:** 400 validación, 401 `Credenciales inválidas o token no proporcionado` (correo inexistente, password incorrecto, o usuario con `estado != ACTIVO`).

---

### 6.3 `POST /clientes` — Registrar cliente

🔒 Requiere `Authorization: Bearer <token>`.

**Body:**

| Campo | Tipo | Requerido | Validación |
|---|---|---|---|
| `tipoDocumentoId` | number | Sí | debe existir en el catálogo con `tipo='TDOC'` (ver 6.12) |
| `numeroDocumento` | string | Sí | máx 15 caracteres; único **junto con** `tipoDocumentoId` (el mismo número con otro tipo de documento no es duplicado) |
| `nombres` | string | Sí | máx 100 caracteres |
| `apellidos` | string | Sí | máx 100 caracteres |
| `telefono` | string | No | máx 20 caracteres |
| `direccion` | string | No | máx 200 caracteres |
| `correo` | string | No | si se envía, debe ser email válido, máx 150 caracteres |

```json
// Request
{ "tipoDocumentoId": 8, "numeroDocumento": "12345678", "nombres": "Maria", "apellidos": "Lopez", "telefono": "988777666", "correo": "maria.lopez@test.com" }
```

**201 Created:**
```json
{
  "success": true,
  "message": "Cliente registrado correctamente",
  "data": {
    "clienteId": 1,
    "tipoDocumentoId": 8,
    "tipoDocumentoDesc": "DNI",
    "numeroDocumento": "12345678",
    "nombres": "Maria",
    "apellidos": "Lopez",
    "telefono": "988777666",
    "direccion": null,
    "correo": "maria.lopez@test.com",
    "estadoId": 1,
    "estadoDesc": "ACTIVO",
    "fechaRegistro": "2026-07-28T21:38:59.890711"
  }
}
```

**Errores:** 400 validación, 404 `El tipo de documento indicado no existe` (`tipoDocumentoId` inválido o de otro `tipo`), 400 `El documento ya se encuentra registrado`, 401 sin token.

---

### 6.4 `GET /clientes` — Listar clientes (paginado, filtrable, ordenable)

🔒 Requiere token.

⚠️ **Cambio de contrato respecto a versiones anteriores**: antes `data` era directamente un array; ahora es un objeto `PageResponse<ClienteResponse>`.

**Query params (todos opcionales y combinables):**

| Param | Tipo | Default | Descripción |
|---|---|---|---|
| `page` | number | `0` | página, 0-indexed |
| `size` | number | `10` | tamaño de página, tope 100 (valores fuera de rango se ajustan silenciosamente, no dan error) |
| `sort` | string | `clienteId,asc` | formato `campo,direccion`. Campos válidos: `clienteId`, `nombres`, `apellidos`, `numeroDocumento`, `fechaRegistro`. Un campo no reconocido cae al default sin dar error |
| `documento` | string | — | búsqueda parcial (contains, insensible a mayúsculas) sobre `numeroDocumento` |
| `nombre` | string | — | búsqueda parcial sobre `nombres` **o** `apellidos` |
| `estadoId` | number | — | filtro exacto |
| `tipoDocumentoId` | number | — | filtro exacto |

```
GET /clientes?page=0&size=10
GET /clientes?documento=12345678
GET /clientes?nombre=Juan
GET /clientes?sort=apellidos,asc
GET /clientes?nombre=Juan&estadoId=1&sort=apellidos,desc&page=0&size=20
```

**200 OK:**
```json
{
  "success": true,
  "message": "Clientes obtenidos correctamente",
  "data": {
    "content": [
      { "clienteId": 2, "tipoDocumentoId": 8, "tipoDocumentoDesc": "DNI", "numeroDocumento": "A1785298561", "nombres": "Ana Maria", "apellidos": "Torres", "telefono": "999111222", "direccion": "Av. Test 456", "correo": null, "estadoId": 2, "estadoDesc": "INACTIVO", "fechaRegistro": "2026-07-28T23:16:02" }
    ],
    "page": 0,
    "size": 10,
    "totalElements": 1,
    "totalPages": 1,
    "first": true,
    "last": true
  }
}
```
`content` puede ser `[]` (nunca hay error por "no encontrado" en un listado, solo una página vacía).

**Errores:** 401 sin token.

---

### 6.13 `GET /clientes/{id}` — Detalle de un cliente

🔒 Requiere token.

**Path param:** `id` (number) — `clienteId`.

**200 OK:** mismo shape que `ClienteResponse` (ver 6.3), `message: "Cliente obtenido correctamente"`.

**Errores:** 404 `Cliente no encontrado`, 401 sin token.

---

### 6.14 `PUT /clientes/{id}` — Actualizar cliente (reemplazo completo)

🔒 Requiere token.

**Path param:** `id` (number).

**Body:** mismo shape y mismas validaciones que `ClienteRequest` (ver 6.3) — incluye `tipoDocumentoId` y `numeroDocumento`, así que también se pueden corregir. **No incluye `estado`** — para eso está 6.15.

```json
// Request
{ "tipoDocumentoId": 8, "numeroDocumento": "A1785298561", "nombres": "Ana Maria", "apellidos": "Torres", "telefono": "999111222", "direccion": "Av. Test 456" }
```

**200 OK:** `ClienteResponse` actualizado, `message: "Cliente actualizado correctamente"`.

**Errores:** 400 validación, 404 `Cliente no encontrado`, 404 `El tipo de documento indicado no existe`, 400 `El documento ya se encuentra registrado` (si la combinación `tipoDocumentoId`+`numeroDocumento` ya la usa **otro** cliente — no choca contra sí mismo), 401 sin token.

---

### 6.15 `PATCH /clientes/{id}/estado` — Cambiar estado de un cliente

🔒 Requiere token.

**Path param:** `id` (number).

**Body:**

| Campo | Tipo | Requerido | Validación |
|---|---|---|---|
| `estadoId` | number | Sí | debe existir en el catálogo con `tipo='ST'` (ver 6.12) |

```json
// Request
{ "estadoId": 2 }
```

**200 OK:** `ClienteResponse` con el `estadoId`/`estadoDesc` nuevo, `message: "Estado del cliente actualizado correctamente"`.

**Errores:** 400 validación, 404 `Cliente no encontrado`, 404 `El estado indicado no existe` (`estadoId` inválido o de otro `tipo`), 401 sin token.

---

### 6.5 `POST /prestamos` — Registrar préstamo

🔒 Requiere token. Al registrarse queda en estado `PENDIENTE` y con su cronograma **proyectado** ya calculado (no hay cuotas reales todavía — esas se crean al aprobar, ver 6.8).

**Body:**

| Campo | Tipo | Requerido | Validación |
|---|---|---|---|
| `clienteId` | number | Sí | debe existir (`GET /clientes` para conseguirlo) |
| `monto` | number | Sí | positivo, máx 10 dígitos enteros + 2 decimales |
| `tasaInteres` | number | Sí | **tasa ANUAL** (no mensual), positivo, máx 3 dígitos enteros + 2 decimales |
| `plazoMeses` | number | Sí | entero entre 1 y 360 |

```json
// Request
{ "clienteId": 1, "monto": 1000, "tasaInteres": 12, "plazoMeses": 3 }
```

**201 Created:**
```json
{
  "success": true,
  "message": "Préstamo registrado correctamente",
  "data": {
    "prestamoId": 1,
    "clienteId": 1,
    "cotizacionId": 1,
    "monto": 1000,
    "tasaInteres": 12,
    "plazoMeses": 3,
    "cuotaMensual": 340.02,
    "totalInteres": 20.07,
    "totalPagar": 1020.07,
    "estadoId": 3,
    "estadoDesc": "PENDIENTE",
    "fechaAprobacion": null,
    "fechaDesembolso": null
  }
}
```

El cálculo usa el **sistema francés (cuota fija)**: la tasa anual se convierte internamente a mensual. `cuotaMensual`, `totalInteres` y `totalPagar` ya vienen calculados — el frontend no necesita (ni debe) recalcularlos.

**Errores:** 400 validación, 404 `Cliente no encontrado`, 401 sin token.

---

### 6.6 `GET /prestamos` — Listar préstamos

🔒 Requiere token. Sin filtros ni paginación.

**200 OK:** array de objetos con el mismo shape que `PrestamoResponse` (sección 6.5), `message: "Préstamos obtenidos correctamente"`.

---

### 6.7 `GET /prestamos/{id}` — Detalle de préstamo + cronograma proyectado

🔒 Requiere token.

**Path param:** `id` (number) — `prestamoId`.

**200 OK:**
```json
{
  "success": true,
  "message": "Detalle del préstamo obtenido correctamente",
  "data": {
    "prestamoId": 1, "clienteId": 1, "cotizacionId": 1,
    "monto": 1000.00, "tasaInteres": 12.00, "plazoMeses": 3,
    "cuotaMensual": 340.02, "totalInteres": 20.07, "totalPagar": 1020.07,
    "estadoId": 3, "estadoDesc": "PENDIENTE", "fechaAprobacion": null, "fechaDesembolso": null,
    "cronograma": [
      { "numeroCuota": 1, "fechaPago": "2026-08-27", "capital": 330.02, "interes": 10.00, "cuota": 340.02, "saldo": 669.98 },
      { "numeroCuota": 2, "fechaPago": "2026-09-27", "capital": 333.32, "interes": 6.70,  "cuota": 340.02, "saldo": 336.66 },
      { "numeroCuota": 3, "fechaPago": "2026-10-27", "capital": 336.66, "interes": 3.37,  "cuota": 340.03, "saldo": 0.00 }
    ]
  }
}
```

⚠️ Importante: `cronograma` es la **proyección** (tabla `detalle_cotizacion`), generada en el momento del registro y fija desde entonces. Una vez aprobado el préstamo, las cuotas **reales** (que sí cambian de estado al pagar) se consultan aparte con `GET /prestamos/{id}/cuotas` (sección 6.9) — tienen los mismos números pero son un recurso distinto.

**Errores:** 404 `Préstamo no encontrado`, 401 sin token.

---

### 6.8 `PATCH /prestamos/{id}/aprobar` — Aprobar préstamo

🔒 Requiere token. Sin body.

**Path param:** `id` (number).

Efecto: cambia `estadoId`/`estadoDesc` a `APROBADO`, setea `fechaAprobacion`, y **genera las cuotas reales** (a partir de este momento existen filas consultables en `GET /prestamos/{id}/pagos` y son las que se pueden pagar).

**200 OK:** mismo shape que `PrestamoResponse`, con `estadoDesc: "APROBADO"` y `fechaAprobacion` seteada.

**Errores:**
- 404 `Préstamo no encontrado`
- 400 `El préstamo no se encuentra en estado PENDIENTE` — ya estaba aprobado (no se puede aprobar dos veces)
- 401 sin token

---

### 6.9 `GET /prestamos/{id}/cuotas` — Listar cuotas reales del préstamo

🔒 Requiere token.

**Path param:** `id` (number).

**200 OK:**
```json
{
  "success": true,
  "message": "Cuotas obtenidas correctamente",
  "data": [
    { "cuotaId": 1, "prestamoId": 1, "numeroCuota": 1, "fechaVencimiento": "2026-08-27", "capital": 330.02, "interes": 10.00, "monto": 340.02, "saldo": 669.98, "estadoId": 3, "estadoDesc": "PENDIENTE" },
    { "cuotaId": 2, "prestamoId": 1, "numeroCuota": 2, "fechaVencimiento": "2026-09-27", "capital": 333.32, "interes": 6.70,  "monto": 340.02, "saldo": 336.66, "estadoId": 3, "estadoDesc": "PENDIENTE" },
    { "cuotaId": 3, "prestamoId": 1, "numeroCuota": 3, "fechaVencimiento": "2026-10-27", "capital": 336.66, "interes": 3.37,  "monto": 340.03, "saldo": 0.00,   "estadoId": 3, "estadoDesc": "PENDIENTE" }
  ]
}
```

⚠️ Si el préstamo todavía está `PENDIENTE` (no aprobado), esto devuelve `data: []` — **no es un error**, es el comportamiento esperado (las cuotas recién se crean al aprobar). Distinguir de un `id` inexistente, que sí da 404.

**Errores:** 404 `Préstamo no encontrado`, 401 sin token.

---

### 6.10 `POST /prestamos/{id}/pagos` — Registrar pago

🔒 Requiere token.

**Path param:** `id` (number) — `prestamoId`.

**Body:**

| Campo | Tipo | Requerido | Validación |
|---|---|---|---|
| `montoPagado` | number | Sí | positivo, máx 10 dígitos enteros + 2 decimales, **debe ser exactamente igual** al `monto` de la cuota que se va a pagar |
| `metodoPago` | string | Sí | no vacío, máx 30 caracteres (valor libre, ej. `"EFECTIVO"`, `"TRANSFERENCIA"`) |

**Comportamiento clave:** este endpoint **no recibe `cuotaId`**. El backend paga automáticamente la cuota `PENDIENTE` con el `numeroCuota` más bajo del préstamo (la "siguiente cuota que toca"). Por eso, antes de llamar a este endpoint, el frontend debería llamar a `GET /prestamos/{id}/cuotas`, filtrar la primera con `estadoDesc: "PENDIENTE"`, mostrarle al usuario su `monto` exacto, y enviar ese mismo valor en `montoPagado`. No se admiten pagos parciales — el monto debe coincidir exacto o la API rechaza con 400.

```json
// Request
{ "montoPagado": 340.02, "metodoPago": "EFECTIVO" }
```

**201 Created:**
```json
{
  "success": true,
  "message": "Pago registrado correctamente",
  "data": {
    "pagoId": 1, "cuotaId": 1, "prestamoId": 1, "numeroCuota": 1,
    "fechaPago": "2026-07-27T03:09:26.3548012",
    "montoPagado": 340.02, "metodoPago": "EFECTIVO"
  }
}
```

**Errores:**
- 400 validación
- 404 `Préstamo no encontrado`
- 400 `El préstamo debe estar aprobado para registrar pagos` — préstamo aún `PENDIENTE`
- 400 `El préstamo no tiene cuotas pendientes de pago` — todas las cuotas ya están `PAGADO`
- 400 `El monto pagado debe ser igual al monto de la cuota pendiente` — `montoPagado` no calza exacto
- 401 sin token

---

### 6.11 `GET /prestamos/{id}/pagos` — Historial de pagos del préstamo

🔒 Requiere token.

**Path param:** `id` (number).

**200 OK:** array de `PagoResponse` (mismo shape que 6.10), ordenado por `fechaPago` ascendente, `message: "Pagos obtenidos correctamente"`.

**Errores:** 404 `Préstamo no encontrado`, 401 sin token.

---

### 6.12 `GET /parametros` — Catálogo de parámetros (estados, tipos de documento)

🔒 Requiere token.

**Query param opcional:** `tipo` — filtra por catálogo (`ST` = estados, `TDOC` = tipo de documento). Sin el parámetro, devuelve el catálogo completo.

```
GET /parametros?tipo=TDOC
GET /parametros?tipo=ST
GET /parametros
```

**200 OK:**
```json
{
  "success": true,
  "message": "Parámetros obtenidos correctamente",
  "data": [
    { "parametroId": 8, "tipo": "TDOC", "codigo": "DNI", "descripcion": "DNI" },
    { "parametroId": 9, "tipo": "TDOC", "codigo": "CE", "descripcion": "CE" },
    { "parametroId": 10, "tipo": "TDOC", "codigo": "PAS", "descripcion": "PASAPORTE" },
    { "parametroId": 11, "tipo": "TDOC", "codigo": "RUC", "descripcion": "RUC" }
  ]
}
```

Este es el endpoint que el frontend debe usar para poblar cualquier `<select>` de tipo de documento o de estado — **los `parametroId` no están garantizados a ser estables** entre distintas instalaciones/entornos de la base de datos (dependen del orden de los `INSERT` del script), así que nunca hardcodear un id; siempre resolverlo dinámicamente vía este endpoint. `codigo` es una abreviación estable pensada para lógica de negocio (ej. `data.find(p => p.codigo === 'DNI').parametroId`); `descripcion` es el texto completo pensado para mostrar al usuario (ej. en el `<select>` se muestra `descripcion`, se guarda `parametroId`).

Valores de `codigo` disponibles hoy: `tipo=ST` → `ACT` (ACTIVO), `INA` (INACTIVO), `PEN` (PENDIENTE), `APR` (APROBADO), `RECH` (RECHAZADO), `PAG` (PAGADO), `ANUL` (ANULADO). `tipo=TDOC` → `DNI`, `CE`, `PAS` (PASAPORTE), `RUC`.

**Errores:** 401 sin token. Un `tipo` desconocido no da error, simplemente devuelve `data: []`.

---

### 6.16 `POST /cotizaciones` — Registrar cotización

🔒 Requiere token.

Una cotización es una **simulación** de préstamo: calcula y guarda el cronograma, pero **no crea ningún préstamo todavía**. Body y validaciones idénticos a `POST /prestamos` (ver 6.5) — mismo cálculo (sistema francés, tasa anual), pero el resultado se guarda como cotización en estado `PENDIENTE`.

**Body:**

| Campo | Tipo | Requerido | Validación |
|---|---|---|---|
| `clienteId` | number | Sí | debe existir |
| `monto` | number | Sí | positivo, máx 10 dígitos enteros + 2 decimales |
| `tasaInteres` | number | Sí | tasa **ANUAL**, positivo, máx 3 dígitos enteros + 2 decimales |
| `plazoMeses` | number | Sí | entero entre 1 y 360 |

```json
// Request
{ "clienteId": 1, "monto": 600, "tasaInteres": 20, "plazoMeses": 3 }
```

**201 Created:**
```json
{
  "success": true,
  "message": "Cotización registrada correctamente",
  "data": {
    "cotizacionId": 2, "clienteId": 1,
    "monto": 600, "tasaInteres": 20, "plazoMeses": 3,
    "cuotaMensual": 206.70, "totalInteres": 20.11, "totalPagar": 620.11,
    "estadoId": 3, "estadoDesc": "PENDIENTE",
    "fechaRegistro": "2026-07-28T23:16:50.591859"
  }
}
```

**Errores:** 400 validación, 404 `Cliente no encontrado`, 401 sin token.

---

### 6.17 `GET /cotizaciones` — Listar cotizaciones

🔒 Requiere token. Sin filtros ni paginación (igual que `GET /prestamos`).

**200 OK:** array de objetos con el mismo shape que `CotizacionResponse` (ver 6.16), `message: "Cotizaciones obtenidas correctamente"`.

---

### 6.18 `GET /cotizaciones/{id}` — Detalle + cronograma

🔒 Requiere token.

**Path param:** `id` (number) — `cotizacionId`.

**200 OK:**
```json
{
  "success": true,
  "message": "Detalle de la cotización obtenido correctamente",
  "data": {
    "cotizacionId": 2, "clienteId": 1,
    "monto": 600.00, "tasaInteres": 20.00, "plazoMeses": 3,
    "cuotaMensual": 206.70, "totalInteres": 20.11, "totalPagar": 620.11,
    "estadoId": 3, "estadoDesc": "PENDIENTE",
    "fechaRegistro": "2026-07-28T23:16:50",
    "cronograma": [
      { "numeroCuota": 1, "fechaPago": "2026-08-28", "capital": 196.70, "interes": 10.00, "cuota": 206.70, "saldo": 403.30 },
      { "numeroCuota": 2, "fechaPago": "2026-09-28", "capital": 199.98, "interes": 6.72,  "cuota": 206.70, "saldo": 203.32 },
      { "numeroCuota": 3, "fechaPago": "2026-10-28", "capital": 203.32, "interes": 3.39,  "cuota": 206.71, "saldo": 0.00 }
    ]
  }
}
```

**Errores:** 404 `Cotización no encontrada`, 401 sin token.

---

### 6.19 `PATCH /cotizaciones/{id}/aprobar` — Aprobar cotización (genera préstamo + cuotas)

🔒 Requiere token. Sin body.

**Path param:** `id` (number).

Efecto: cambia la cotización a `APROBADO`, **crea un `Prestamo` nuevo ya en estado `APROBADO`** (con `fechaAprobacion` seteada), y **genera todas sus `Cuota` en estado `PENDIENTE`** a partir del cronograma — todo en una sola transacción. Solo se puede aprobar una cotización que esté `PENDIENTE`.

⚠️ **Importante:** este endpoint devuelve el **`PrestamoResponse`** recién creado (no la cotización) — es el artefacto útil resultante de la acción, con su propio `prestamoId` listo para consultar `GET /prestamos/{prestamoId}/cuotas` o registrar pagos directamente.

**200 OK:**
```json
{
  "success": true,
  "message": "Cotización aprobada correctamente, préstamo generado",
  "data": {
    "prestamoId": 2, "clienteId": 1, "cotizacionId": 2,
    "monto": 600.00, "tasaInteres": 20.00, "plazoMeses": 3,
    "cuotaMensual": 206.70, "totalInteres": 20.11, "totalPagar": 620.11,
    "estadoId": 4, "estadoDesc": "APROBADO",
    "fechaAprobacion": "2026-07-28T23:17:11.9658958", "fechaDesembolso": null
  }
}
```

**Errores:**
- 404 `Cotización no encontrada`
- 400 `La cotización ya fue aprobada` — ya se había aprobado antes (no se puede dos veces)
- 400 `La cotización fue eliminada y no puede aprobarse` — está `ANULADO` (ver 6.20)
- 401 sin token

---

### 6.20 `DELETE /cotizaciones/{id}` — Anular cotización

🔒 Requiere token.

**Path param:** `id` (number).

Es un **soft-delete**: cambia el estado a `ANULADO`, no borra la fila (una cotización eliminada debe seguir existiendo para poder rechazar un intento posterior de aprobarla). Devuelve **200**, no 204, con la cotización actualizada — igual que el resto de las acciones de este API.

**200 OK:** `CotizacionResponse` con `estadoDesc: "ANULADO"`, `message: "Cotización eliminada correctamente"`.

**Errores:**
- 404 `Cotización no encontrada`
- 400 `No se puede eliminar una cotización ya aprobada` — ya tiene un préstamo real generado
- 400 `La cotización ya se encuentra eliminada` — ya estaba `ANULADO`
- 401 sin token

---

## 7. Flujo de negocio recomendado (orden de llamadas)

### Flujo directo (préstamo inmediato, sin pasar por cotización)

```
1. POST /auth/register  (o /auth/login si el usuario ya existe)  →  guardar token
2. GET  /parametros?tipo=TDOC                                     →  poblar el <select> de tipo de documento
3. POST /clientes            { tipoDocumentoId, numeroDocumento, ... }  →  clienteId
4. POST /prestamos            { clienteId, monto, tasaInteres (anual), plazoMeses }
5. GET  /prestamos/{id}       → mostrar cronograma proyectado antes de aprobar
6. PATCH /prestamos/{id}/aprobar                                  →  genera las cuotas reales
7. GET  /prestamos/{id}/cuotas                                    →  ver cuál cuota toca pagar (la primera con estadoDesc PENDIENTE)
8. POST /prestamos/{id}/pagos { montoPagado: <monto exacto de esa cuota>, metodoPago }
   → repetir 7-8 hasta que no queden cuotas PENDIENTE
9. GET  /prestamos/{id}/pagos                                     →  historial completo
```

### Flujo vía cotización (simular antes de comprometerse)

Útil cuando se quiere mostrarle al cliente varias simulaciones (distintos montos/plazos) antes de decidir cuál aprobar — cada `POST /cotizaciones` es "gratis" (no genera nada más que el cálculo), a diferencia de `POST /prestamos` que ya deja un préstamo `PENDIENTE` en el sistema.

```
1-3. (igual que el flujo directo)
4. POST /cotizaciones         { clienteId, monto, tasaInteres (anual), plazoMeses }  →  cotizacionId
   → repetir 4 con distintos montos/plazos si se quieren comparar varias opciones
5. GET  /cotizaciones/{id}    → mostrar cronograma de la opción elegida
6. PATCH /cotizaciones/{id}/aprobar                               →  devuelve el PrestamoResponse recién creado (con cuotas ya generadas)
7. GET  /prestamos/{prestamoId}/cuotas, POST .../pagos, etc.      →  igual que el flujo directo desde el paso 7
```

Las cotizaciones que no se van a usar se pueden descartar con `DELETE /cotizaciones/{id}` (no quedan "sueltas" en el sistema).

No existe forma de "editar" o "eliminar" préstamos/cuotas/pagos — solo clientes (`PUT`/`PATCH estado`) y cotizaciones (`DELETE`, como soft-delete) tienen esas operaciones. Cualquier otra corrección de datos requiere coordinación directa en base de datos (fuera del alcance de la API).

---

## 8. Ejemplo de servicio Angular (Auth)

```typescript
// auth.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { ApiResponse, AuthResponse, LoginRequest, RegisterRequest } from './models';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/auth`;

  login(request: LoginRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.baseUrl}/login`, request)
      .pipe(tap(res => this.storeToken(res.data)));
  }

  register(request: RegisterRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.baseUrl}/register`, request)
      .pipe(tap(res => this.storeToken(res.data)));
  }

  logout(): void {
    localStorage.removeItem('token');
  }

  private storeToken(data: AuthResponse | null): void {
    if (data?.token) {
      localStorage.setItem('token', data.token);
    }
  }
}
```
