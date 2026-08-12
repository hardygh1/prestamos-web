import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse, ParametroResponse } from '../models/api.models';

export type TipoParametro = 'TDOC' | 'ST';

@Injectable({ providedIn: 'root' })
export class ParametrosService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/parametros`;

  // Los parametros son un catalogo estatico de solo lectura (no hay pantalla
  // en la app para editarlos), asi que se cachea por tipo para no repetir la
  // llamada cada vez que se abre un dialogo que los necesita.
  private readonly cache = new Map<string, Observable<ApiResponse<ParametroResponse[]>>>();

  listar(tipo?: TipoParametro): Observable<ApiResponse<ParametroResponse[]>> {
    const key = tipo ?? 'ALL';
    let request$ = this.cache.get(key);
    if (!request$) {
      const params = tipo ? new HttpParams().set('tipo', tipo) : undefined;
      request$ = this.http
        .get<ApiResponse<ParametroResponse[]>>(this.baseUrl, { params })
        .pipe(shareReplay(1));
      this.cache.set(key, request$);
    }
    return request$;
  }
}
