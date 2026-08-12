import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  ApiResponse,
  CotizacionDetalleResponse,
  CotizacionRequest,
  CotizacionResponse,
  PrestamoResponse,
} from '../shared/models/api.models';

@Injectable({ providedIn: 'root' })
export class CotizacionesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/cotizaciones`;

  listar(): Observable<ApiResponse<CotizacionResponse[]>> {
    return this.http.get<ApiResponse<CotizacionResponse[]>>(this.baseUrl);
  }

  registrar(request: CotizacionRequest): Observable<ApiResponse<CotizacionResponse>> {
    return this.http.post<ApiResponse<CotizacionResponse>>(this.baseUrl, request);
  }

  detalle(id: number): Observable<ApiResponse<CotizacionDetalleResponse>> {
    return this.http.get<ApiResponse<CotizacionDetalleResponse>>(`${this.baseUrl}/${id}`);
  }

  // OJO: aprobar una cotizacion devuelve el PrestamoResponse recien creado
  // (ya en estado APROBADO con cuotas generadas), no la cotizacion.
  aprobar(id: number): Observable<ApiResponse<PrestamoResponse>> {
    return this.http.patch<ApiResponse<PrestamoResponse>>(`${this.baseUrl}/${id}/aprobar`, {});
  }

  eliminar(id: number): Observable<ApiResponse<CotizacionResponse>> {
    return this.http.put<ApiResponse<CotizacionResponse>>(`${this.baseUrl}/${id}`, {});
  }
}
