import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { catchError, throwError } from 'rxjs';

import { ApiResponse } from '../shared/models/api.models';
import { AuthService } from './auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const messageService = inject(MessageService);

  const isAuthRequest = req.url.includes('/auth/');

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !isAuthRequest) {
        // Sesion expirada o token invalido en un endpoint protegido: no es un error a mostrar,
        // es una redireccion. Un 401 de /auth/login (credenciales invalidas) cae en el else.
        auth.logout();
        router.navigateByUrl('/login');
      } else {
        const apiMessage = (err.error as ApiResponse<unknown> | null)?.message;
        messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: apiMessage ?? 'Ocurrio un error inesperado. Intenta nuevamente.',
        });
      }
      return throwError(() => err);
    }),
  );
};
