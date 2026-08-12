import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { ApiResponse, CuotaResponse, PagoRequest, PagoResponse } from '../shared/models/api.models';

@Injectable({ providedIn: 'root' })
export class PagosService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/prestamos`;

  cuotas(prestamoId: number): Observable<ApiResponse<CuotaResponse[]>> {
    return this.http.get<ApiResponse<CuotaResponse[]>>(`${this.baseUrl}/${prestamoId}/cuotas`);
  }

  pagar(prestamoId: number, request: PagoRequest): Observable<ApiResponse<PagoResponse>> {
    return this.http.post<ApiResponse<PagoResponse>>(
      `${this.baseUrl}/${prestamoId}/pagos`,
      request,
    );
  }

  historial(prestamoId: number): Observable<ApiResponse<PagoResponse[]>> {
    return this.http.get<ApiResponse<PagoResponse[]>>(`${this.baseUrl}/${prestamoId}/pagos`);
  }
}
