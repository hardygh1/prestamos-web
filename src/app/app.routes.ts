import { Routes } from '@angular/router';

import { authGuard } from './auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/layout.component').then((m) => m.LayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        data: { title: 'Dashboard' },
        loadComponent: () =>
          import('./dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'clientes',
        data: { title: 'Clientes' },
        loadComponent: () =>
          import('./clientes/clientes-listado.component').then((m) => m.ClientesListadoComponent),
      },
      {
        path: 'cotizaciones',
        data: { title: 'Cotizaciones' },
        loadComponent: () =>
          import('./cotizaciones/cotizaciones-listado.component').then(
            (m) => m.CotizacionesListadoComponent,
          ),
      },
      {
        path: 'cotizaciones/:id',
        data: { title: 'Detalle de cotizacion' },
        loadComponent: () =>
          import('./cotizaciones/cotizacion-detalle.component').then(
            (m) => m.CotizacionDetalleComponent,
          ),
      },
      {
        path: 'prestamos',
        data: { title: 'Prestamos' },
        loadComponent: () =>
          import('./prestamos/prestamos-listado.component').then(
            (m) => m.PrestamosListadoComponent,
          ),
      },
      {
        path: 'prestamos/:id',
        data: { title: 'Detalle de prestamo' },
        loadComponent: () =>
          import('./prestamos/prestamo-detalle.component').then((m) => m.PrestamoDetalleComponent),
      },
      {
        path: 'pagos',
        data: { title: 'Pagos' },
        loadComponent: () =>
          import('./pagos/pagos-listado.component').then((m) => m.PagosListadoComponent),
      },
      {
        path: 'pagos/:id',
        data: { title: 'Pagos del prestamo' },
        loadComponent: () =>
          import('./pagos/pago-detalle.component').then((m) => m.PagoDetalleComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
