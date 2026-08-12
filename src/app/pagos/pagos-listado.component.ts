import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CardComponent } from '@coreui/angular';
import { PrimeTemplate } from 'primeng/api';
import { Button } from 'primeng/button';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputText } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';

import { ClientesService } from '../clientes/clientes.service';
import { PrestamosService } from '../prestamos/prestamos.service';
import { ClienteResponse, PrestamoResponse } from '../shared/models/api.models';
import { ClienteLabelPipe, clienteLabel } from '../shared/pipes/cliente-label.pipe';

@Component({
  selector: 'app-pagos-listado',
  imports: [
    FormsModule,
    CardComponent,
    Button,
    IconField,
    InputIcon,
    InputText,
    TableModule,
    Tag,
    PrimeTemplate,
    DecimalPipe,
    ClienteLabelPipe,
  ],
  templateUrl: './pagos-listado.component.html',
})
export class PagosListadoComponent implements OnInit {
  private readonly prestamosService = inject(PrestamosService);
  private readonly clientesService = inject(ClientesService);
  private readonly router = inject(Router);

  protected readonly prestamos = signal<PrestamoResponse[]>([]);
  protected readonly clientes = signal<ClienteResponse[]>([]);
  protected readonly loading = signal(false);
  protected readonly filtro = signal('');

  protected readonly prestamosFiltrados = computed(() => {
    const termino = this.filtro().trim().toLowerCase();
    if (!termino) {
      return this.prestamos();
    }
    return this.prestamos().filter((p) =>
      `${clienteLabel(this.clientes(), p.clienteId)} ${p.estadoDesc}`
        .toLowerCase()
        .includes(termino),
    );
  });

  ngOnInit(): void {
    this.clientesService.listar({ size: 100 }).subscribe({
      next: (res) => this.clientes.set(res.data?.content ?? []),
      error: () => this.clientes.set([]),
    });
    this.loading.set(true);
    this.prestamosService.listar().subscribe({
      next: (res) => {
        this.prestamos.set(res.data ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected gestionarPagos(prestamoId: number): void {
    this.router.navigate(['/pagos', prestamoId]);
  }

  protected inicialesCliente(clienteId: number): string {
    const cliente = this.clientes().find((c) => c.clienteId === clienteId);
    return cliente
      ? `${cliente.nombres.charAt(0)}${cliente.apellidos.charAt(0)}`.toUpperCase()
      : '?';
  }
}
