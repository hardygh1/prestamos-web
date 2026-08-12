import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../environments/environment';
import { ApiResponse, AuthResponse, LoginRequest } from '../shared/models/api.models';

const STORAGE_KEY = 'prestamos-web.auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/auth`;

  private readonly authData = signal<AuthResponse | null>(this.readStoredAuth());

  readonly usuario = computed(() => this.authData());
  readonly isAuthenticated = computed(() => this.authData() !== null);
  readonly token = computed(() => this.authData()?.token ?? null);

  login(request: LoginRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http
      .post<ApiResponse<AuthResponse>>(`${this.baseUrl}/login`, request)
      .pipe(tap((res) => this.setAuth(res.data)));
  }

  logout(): void {
    this.setAuth(null);
  }

  private setAuth(data: AuthResponse | null): void {
    this.authData.set(data);
    if (data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  private readStoredAuth(): AuthResponse | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as AuthResponse;
    } catch {
      return null;
    }
  }
}
