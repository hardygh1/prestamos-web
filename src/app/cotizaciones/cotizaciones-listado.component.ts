import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CardComponent } from '@coreui/angular';
import { ConfirmationService, MessageService, PrimeTemplate } from 'primeng/api';
import { Button } from 'primeng/button';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Dialog } from 'primeng/dialog';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';

import { ClientesService } from '../clientes/clientes.service';
import {
  ClienteResponse,
  CotizacionRequest,
  CotizacionResponse,
} from '../shared/models/api.models';
import { ClienteLabelPipe, clienteLabel } from '../shared/pipes/cliente-label.pipe';
import { CotizacionesService } from './cotizaciones.service';

@Component({
  selector: 'app-cotizaciones-listado',
  imports: [
    ReactiveFormsModule,
    FormsModule,
    CardComponent,
    Button,
    ConfirmDialog,
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
  templateUrl: './cotizaciones-listado.component.html',
})
export class CotizacionesListadoComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly cotizacionesService = inject(CotizacionesService);
  private readonly clientesService = inject(ClientesService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly router = inject(Router);

  protected readonly cotizaciones = signal<CotizacionResponse[]>([]);
  protected readonly clientes = signal<ClienteResponse[]>([]);
  protected readonly loading = signal(false);
  protected readonly dialogVisible = signal(false);
  protected readonly saving = signal(false);
  protected readonly filtro = signal('');

  protected readonly cotizacionesFiltradas = computed(() => {
    const termino = this.filtro().trim().toLowerCase();
    if (!termino) {
      return this.cotizaciones();
    }
    return this.cotizaciones().filter((c) =>
      `${clienteLabel(this.clientes(), c.clienteId)} ${c.estadoDesc}`
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
    this.cargarCotizaciones();
  }

  protected verDetalle(cotizacionId: number): void {
    this.router.navigate(['/cotizaciones', cotizacionId]);
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

  private cargarCotizaciones(): void {
    this.loading.set(true);
    this.cotizacionesService.listar().subscribe({
      next: (res) => {
        this.cotizaciones.set(res.data ?? []);
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
    const request: CotizacionRequest = {
      clienteId: raw.clienteId as number,
      monto: raw.monto as number,
      tasaInteres: raw.tasaInteres as number,
      plazoMeses: raw.plazoMeses as number,
    };

    this.saving.set(true);
    this.cotizacionesService.registrar(request).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.dialogVisible.set(false);
        if (res.data) {
          const nueva = res.data;
          this.cotizaciones.update((lista) => [...lista, nueva]);
        }
        this.messageService.add({
          severity: 'success',
          summary: 'Cotizacion registrada',
          detail: res.message,
        });
      },
      error: () => this.saving.set(false),
    });
  }

  protected confirmarEliminar(cotizacion: CotizacionResponse): void {
    this.confirmationService.confirm({
      header: 'Anular cotizacion',
      message: `¿Anular la cotizacion #${cotizacion.cotizacionId} de ${clienteLabel(this.clientes(), cotizacion.clienteId)}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Anular',
      rejectLabel: 'Cancelar',
      acceptButtonProps: { severity: 'danger' },
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () => this.eliminar(cotizacion),
    });
  }

  private eliminar(cotizacion: CotizacionResponse): void {
    this.cotizacionesService.eliminar(cotizacion.cotizacionId).subscribe({
      next: (res) => {
        const actualizada = res.data;
        if (actualizada) {
          this.cotizaciones.update((lista) =>
            lista.map((c) => (c.cotizacionId === actualizada.cotizacionId ? actualizada : c)),
          );
        }
        this.messageService.add({
          severity: 'success',
          summary: 'Cotizacion eliminada',
          detail: res.message,
        });
      },
    });
  }
}
