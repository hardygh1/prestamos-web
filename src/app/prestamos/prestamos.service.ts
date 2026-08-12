import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  ApiResponse,
  PrestamoDetalleResponse,
  PrestamoRequest,
  PrestamoResponse,
} from '../shared/models/api.models';

@Injectable({ providedIn: 'root' })
export class PrestamosService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/prestamos`;

  listar(): Observable<ApiResponse<PrestamoResponse[]>> {
    return this.http.get<ApiResponse<PrestamoResponse[]>>(this.baseUrl);
  }

  registrar(request: PrestamoRequest): Observable<ApiResponse<PrestamoResponse>> {
    return this.http.post<ApiResponse<PrestamoResponse>>(this.baseUrl, request);
  }

  detalle(id: number): Observable<ApiResponse<PrestamoDetalleResponse>> {
    return this.http.get<ApiResponse<PrestamoDetalleResponse>>(`${this.baseUrl}/${id}`);
  }

  aprobar(id: number): Observable<ApiResponse<PrestamoResponse>> {
    return this.http.patch<ApiResponse<PrestamoResponse>>(`${this.baseUrl}/${id}/aprobar`, {});
  }
}
