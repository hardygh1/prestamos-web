import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CardComponent } from '@coreui/angular';
import { MessageService, PrimeTemplate } from 'primeng/api';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';

import { ClientesService } from '../clientes/clientes.service';
import { ClienteResponse, PrestamoRequest, PrestamoResponse } from '../shared/models/api.models';
import { ClienteLabelPipe, clienteLabel } from '../shared/pipes/cliente-label.pipe';
import { PrestamosService } from './prestamos.service';

@Component({
  selector: 'app-prestamos-listado',
  imports: [
    ReactiveFormsModule,
    FormsModule,
    CardComponent,
    Button,
    Dialog,
    IconField,
    InputIcon,
    InputNumber,
    InputText,
    Select,
    TableModule,
    Tag,
    PrimeTemplate,
    DecimalPipe,
    ClienteLabelPipe,
  ],
  templateUrl: './prestamos-listado.component.html',
})
export class PrestamosListadoComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly prestamosService = inject(PrestamosService);
  private readonly clientesService = inject(ClientesService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);

  protected readonly prestamos = signal<PrestamoResponse[]>([]);
  protected readonly clientes = signal<ClienteResponse[]>([]);
  protected readonly loading = signal(false);
  protected readonly dialogVisible = signal(false);
  protected readonly saving = signal(false);
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

  protected readonly clienteOptions = computed(() =>
    this.clientes().map((cliente) => ({
      label: `${cliente.numeroDocumento} - ${cliente.nombres} ${cliente.apellidos}`,
      value: cliente.clienteId,
    })),
  );

  protected readonly form = this.fb.nonNullable.group({
    clienteId: this.fb.control<number | null>(null, Validators.required),
    monto: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
    tasaInteres: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
    plazoMeses: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(1),
      Validators.max(360),
    ]),
  });

  ngOnInit(): void {
    this.cargarClientes();
    this.cargarPrestamos();
  }

  protected verDetalle(prestamoId: number): void {
    this.router.navigate(['/prestamos', prestamoId]);
  }

  protected inicialesCliente(clienteId: number): string {
    const cliente = this.clientes().find((c) => c.clienteId === clienteId);
    return cliente
      ? `${cliente.nombres.charAt(0)}${cliente.apellidos.charAt(0)}`.toUpperCase()
      : '?';
  }

  private cargarClientes(): void {
    this.clientesService.listar({ size: 100 }).subscribe({
      next: (res) => this.clientes.set(res.data?.content ?? []),
      error: () => this.clientes.set([]),
    });
  }

  private cargarPrestamos(): void {
    this.loading.set(true);
    this.prestamosService.listar().subscribe({
      next: (res) => {
        this.prestamos.set(res.data ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected abrirNuevo(): void {
    this.form.reset();
    this.dialogVisible.set(true);
  }

  protected guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const request: PrestamoRequest = {
      clienteId: raw.clienteId as number,
      monto: raw.monto as number,
      tasaInteres: raw.tasaInteres as number,
      plazoMeses: raw.plazoMeses as number,
    };

    this.saving.set(true);
    this.prestamosService.registrar(request).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.dialogVisible.set(false);
        if (res.data) {
          const nuevo = res.data;
          this.prestamos.update((lista) => [...lista, nuevo]);
        }
        this.messageService.add({
          severity: 'success',
          summary: 'Prestamo registrado',
          detail: res.message,
        });
      },
      error: () => this.saving.set(false),
    });
  }
}
