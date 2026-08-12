// ---- Envelope estandar ----
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
}

// ---- Paginacion (usado por GET /clientes) ----
export interface PageResponse<T> {
  content: T[];
  page: number; // pagina actual, 0-indexed
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

// ---- Parametros (catalogo) ----
export interface ParametroResponse {
  parametroId: number;
  tipo: string; // 'ST' (estados) | 'TDOC' (tipo de documento)
  codigo: string; // valor corto/abreviado, ej. 'DNI', 'APR'
  descripcion: string; // texto completo legible, ej. 'DNI', 'APROBADO'
}

// ---- Clientes ----
export interface ClienteRequest {
  tipoDocumentoId: number; // id de un Parametro con tipo='TDOC'
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
  tipoDocumentoDesc: string; // ej. 'DNI'
  numeroDocumento: string;
  nombres: string;
  apellidos: string;
  telefono: string | null;
  direccion: string | null;
  correo: string | null;
  estadoId: number;
  estadoDesc: string; // ej. 'ACTIVO'
  fechaRegistro: string; // ISO LocalDateTime
}

export interface ClienteEstadoRequest {
  estadoId: number; // id de un Parametro con tipo='ST'
}

// ---- Prestamos ----
export interface PrestamoRequest {
  clienteId: number;
  monto: number;
  tasaInteres: number; // ANUAL, no mensual
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
  fechaAprobacion: string | null; // ISO LocalDateTime
  fechaDesembolso: string | null; // ISO LocalDate
}

export interface DetalleCuotaResponse {
  numeroCuota: number;
  fechaPago: string; // ISO LocalDate
  capital: number;
  interes: number;
  cuota: number;
  saldo: number;
}

export interface PrestamoDetalleResponse extends PrestamoResponse {
  cronograma: DetalleCuotaResponse[]; // cronograma PROYECTADO (de la cotizacion)
}

// ---- Cuotas ----
export interface CuotaResponse {
  cuotaId: number;
  prestamoId: number;
  numeroCuota: number;
  fechaVencimiento: string; // ISO LocalDate
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
  metodoPago: string;
}

export interface PagoResponse {
  pagoId: number;
  cuotaId: number;
  prestamoId: number;
  numeroCuota: number;
  fechaPago: string; // ISO LocalDateTime
  montoPagado: number;
  metodoPago: string;
}

// ---- Cotizaciones ----
export interface CotizacionRequest {
  clienteId: number;
  monto: number;
  tasaInteres: number; // ANUAL, igual que en PrestamoRequest
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
  fechaRegistro: string; // ISO LocalDateTime
}

export interface CotizacionDetalleResponse extends CotizacionResponse {
  cronograma: DetalleCuotaResponse[];
}
