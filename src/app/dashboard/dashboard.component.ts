import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CardComponent } from '@coreui/angular';

import { AuthService } from '../auth/auth.service';
import { ClientesService } from '../clientes/clientes.service';
import { PrestamosService } from '../prestamos/prestamos.service';
import { ClienteResponse, PrestamoResponse } from '../shared/models/api.models';

@Component({
  selector: 'app-dashboard',
  imports: [CardComponent, DecimalPipe],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly clientesService = inject(ClientesService);
  private readonly prestamosService = inject(PrestamosService);

  protected readonly clientes = signal<ClienteResponse[]>([]);
  protected readonly prestamos = signal<PrestamoResponse[]>([]);

  protected readonly totalClientes = computed(() => this.clientes().length);
  protected readonly totalPrestamos = computed(() => this.prestamos().length);

  protected readonly prestamosPendientes = computed(
    () => this.prestamos().filter((p) => p.estadoDesc === 'PENDIENTE').length,
  );

  protected readonly prestamosAprobados = computed(
    () => this.prestamos().filter((p) => p.estadoDesc === 'APROBADO').length,
  );

  protected readonly montoTotalPrestado = computed(() =>
    this.prestamos().reduce((total, p) => total + p.monto, 0),
  );

  protected readonly totalPorCobrar = computed(() =>
    this.prestamos()
      .filter((p) => p.estadoDesc === 'APROBADO')
      .reduce((total, p) => total + p.totalPagar, 0),
  );

  ngOnInit(): void {
    this.clientesService.listar({ size: 100 }).subscribe({
      next: (res) => this.clientes.set(res.data?.content ?? []),
      error: () => this.clientes.set([]),
    });
    this.prestamosService.listar().subscribe({
      next: (res) => this.prestamos.set(res.data ?? []),
      error: () => this.prestamos.set([]),
    });
  }
}
