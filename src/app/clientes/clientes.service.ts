import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  ApiResponse,
  ClienteEstadoRequest,
  ClienteRequest,
  ClienteResponse,
  PageResponse,
} from '../shared/models/api.models';

export interface ClientesQueryParams {
  page?: number;
  size?: number;
  sort?: string;
  documento?: string;
  nombre?: string;
  estadoId?: number;
  tipoDocumentoId?: number;
}

@Injectable({ providedIn: 'root' })
export class ClientesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/clientes`;

  listar(params: ClientesQueryParams = {}): Observable<ApiResponse<PageResponse<ClienteResponse>>> {
    let httpParams = new HttpParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value);
      }
    }
    return this.http.get<ApiResponse<PageResponse<ClienteResponse>>>(this.baseUrl, {
      params: httpParams,
    });
  }

  obtener(id: number): Observable<ApiResponse<ClienteResponse>> {
    return this.http.get<ApiResponse<ClienteResponse>>(`${this.baseUrl}/${id}`);
  }

  registrar(request: ClienteRequest): Observable<ApiResponse<ClienteResponse>> {
    return this.http.post<ApiResponse<ClienteResponse>>(this.baseUrl, request);
  }

  actualizar(id: number, request: ClienteRequest): Observable<ApiResponse<ClienteResponse>> {
    return this.http.put<ApiResponse<ClienteResponse>>(`${this.baseUrl}/${id}`, request);
  }

  cambiarEstado(
    id: number,
    request: ClienteEstadoRequest,
  ): Observable<ApiResponse<ClienteResponse>> {
    return this.http.patch<ApiResponse<ClienteResponse>>(`${this.baseUrl}/${id}/estado`, request);
  }
}
