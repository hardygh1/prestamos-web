import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardComponent } from '@coreui/angular';
import { MessageService, PrimeTemplate } from 'primeng/api';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { debounceTime } from 'rxjs';

import { ParametrosService } from '../shared/parametros/parametros.service';
import { ClienteRequest, ClienteResponse, ParametroResponse } from '../shared/models/api.models';
import { ClientesService } from './clientes.service';

@Component({
  selector: 'app-clientes-listado',
  imports: [
    ReactiveFormsModule,
    FormsModule,
    CardComponent,
    Button,
    Dialog,
    IconField,
    InputIcon,
    InputText,
    Select,
    TableModule,
    PrimeTemplate,
    DatePipe,
  ],
  templateUrl: './clientes-listado.component.html',
})
export class ClientesListadoComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly clientesService = inject(ClientesService);
  private readonly parametrosService = inject(ParametrosService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly clientes = signal<ClienteResponse[]>([]);
  protected readonly totalRecords = signal(0);
  protected readonly loading = signal(false);
  protected readonly dialogVisible = signal(false);
  protected readonly saving = signal(false);
  protected readonly editingId = signal<number | null>(null);
  protected readonly tableFirst = signal(0);
  protected readonly tiposDocumento = signal<ParametroResponse[]>([]);
  protected readonly estados = signal<ParametroResponse[]>([]);

  private rows = 10;
  private first = 0;
  private sortField = 'clienteId';
  private sortOrder: 1 | -1 = 1;

  protected readonly tipoDocumentoOptions = computed(() =>
    this.tiposDocumento().map((p) => ({ label: p.descripcion, value: p.parametroId })),
  );

  // El catalogo 'ST' es compartido por toda la app (incluye PENDIENTE/APROBADO/PAGADO/
  // RECHAZADO de prestamos, cuotas y cotizaciones) -- un cliente solo puede ser
  // ACTIVO o INACTIVO, asi que se filtra por esos dos codigos.
  protected readonly estadoOptions = computed(() =>
    this.estados()
      .filter((p) => p.codigo === 'ACT' || p.codigo === 'INA')
      .map((p) => ({ label: p.descripcion, value: p.parametroId })),
  );

  protected readonly filtrosForm = this.fb.nonNullable.group({
    documento: '',
    nombre: '',
    estadoId: this.fb.control<number | null>(null),
  });

  protected readonly form = this.fb.nonNullable.group({
    tipoDocumentoId: this.fb.control<number | null>(null, Validators.required),
    numeroDocumento: ['', [Validators.required, Validators.maxLength(15)]],
    nombres: ['', [Validators.required, Validators.maxLength(100)]],
    apellidos: ['', [Validators.required, Validators.maxLength(100)]],
    telefono: ['', Validators.maxLength(20)],
    direccion: ['', Validators.maxLength(200)],
    correo: ['', [Validators.email, Validators.maxLength(150)]],
  });

  ngOnInit(): void {
    this.cargarCatalogos();
    this.cargarClientes();

    this.filtrosForm.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.first = 0;
        this.tableFirst.set(0);
        this.cargarClientes();
      });
  }

  protected onLazyLoad(event: TableLazyLoadEvent): void {
    this.first = event.first ?? 0;
    this.rows = event.rows ?? this.rows;
    this.sortField = (event.sortField as string | undefined) || 'clienteId';
    this.sortOrder = event.sortOrder === -1 ? -1 : 1;
    this.tableFirst.set(this.first);
    this.cargarClientes();
  }

  protected cargarClientes(): void {
    this.loading.set(true);
    const filtros = this.filtrosForm.getRawValue();
    this.clientesService
      .listar({
        page: Math.floor(this.first / this.rows),
        size: this.rows,
        sort: `${this.sortField},${this.sortOrder === 1 ? 'asc' : 'desc'}`,
        documento: filtros.documento || undefined,
        nombre: filtros.nombre || undefined,
        estadoId: filtros.estadoId ?? undefined,
      })
      .subscribe({
        next: (res) => {
          this.clientes.set(res.data?.content ?? []);
          this.totalRecords.set(res.data?.totalElements ?? 0);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  private cargarCatalogos(): void {
    this.parametrosService.listar('TDOC').subscribe({
      next: (res) => this.tiposDocumento.set(res.data ?? []),
      error: () => this.tiposDocumento.set([]),
    });
    this.parametrosService.listar('ST').subscribe({
      next: (res) => this.estados.set(res.data ?? []),
      error: () => this.estados.set([]),
    });
  }

  protected iniciales(cliente: ClienteResponse): string {
    return `${cliente.nombres.charAt(0)}${cliente.apellidos.charAt(0)}`.toUpperCase();
  }

  protected abrirNuevo(): void {
    this.editingId.set(null);
    this.form.reset();
    this.dialogVisible.set(true);
  }

  protected abrirEditar(cliente: ClienteResponse): void {
    this.clientesService.obtener(cliente.clienteId).subscribe({
      next: (res) => {
        const c = res.data;
        if (!c) {
          return;
        }
        this.form.reset();
        this.form.patchValue({
          tipoDocumentoId: c.tipoDocumentoId,
          numeroDocumento: c.numeroDocumento,
          nombres: c.nombres,
          apellidos: c.apellidos,
          telefono: c.telefono ?? '',
          direccion: c.direccion ?? '',
          correo: c.correo ?? '',
        });
        this.editingId.set(c.clienteId);
        this.dialogVisible.set(true);
      },
    });
  }

  protected guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const request: ClienteRequest = {
      tipoDocumentoId: raw.tipoDocumentoId as number,
      numeroDocumento: raw.numeroDocumento,
      nombres: raw.nombres,
      apellidos: raw.apellidos,
      telefono: raw.telefono || undefined,
      direccion: raw.direccion || undefined,
      correo: raw.correo || undefined,
    };

    const editingId = this.editingId();
    const request$ = editingId
      ? this.clientesService.actualizar(editingId, request)
      : this.clientesService.registrar(request);

    this.saving.set(true);
    request$.subscribe({
      next: (res) => {
        this.saving.set(false);
        this.dialogVisible.set(false);
        this.messageService.add({
          severity: 'success',
          summary: editingId ? 'Cliente actualizado' : 'Cliente registrado',
          detail: res.message,
        });
        this.cargarClientes();
      },
      error: () => this.saving.set(false),
    });
  }

  protected cambiarEstado(cliente: ClienteResponse, estadoId: number): void {
    this.clientesService.cambiarEstado(cliente.clienteId, { estadoId }).subscribe({
      next: (res) => {
        const actualizado = res.data;
        if (!actualizado) {
          return;
        }
        this.clientes.update((lista) =>
          lista.map((c) => (c.clienteId === actualizado.clienteId ? actualizado : c)),
        );
        this.messageService.add({
          severity: 'success',
          summary: 'Estado actualizado',
          detail: res.message,
        });
      },
      error: () => this.cargarClientes(),
    });
  }
}
