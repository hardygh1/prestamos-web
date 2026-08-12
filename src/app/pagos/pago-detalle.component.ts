import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CardComponent } from '@coreui/angular';
import autoTable from 'jspdf-autotable';
import { MessageService, PrimeTemplate } from 'primeng/api';
import { Button } from 'primeng/button';
import { ProgressBar } from 'primeng/progressbar';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';

import { ClientesService } from '../clientes/clientes.service';
import { PrestamosService } from '../prestamos/prestamos.service';
import {
  ClienteResponse,
  CuotaResponse,
  PagoResponse,
  PrestamoResponse,
} from '../shared/models/api.models';
import { agregarCampos, crearReportePdf } from '../shared/pdf/pdf-report.util';
import { ClienteLabelPipe, clienteLabel } from '../shared/pipes/cliente-label.pipe';
import { PagosService } from './pagos.service';

@Component({
  selector: 'app-pago-detalle',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    CardComponent,
    Button,
    ProgressBar,
    Select,
    TableModule,
    Tag,
    PrimeTemplate,
    DecimalPipe,
    ClienteLabelPipe,
  ],
  templateUrl: './pago-detalle.component.html',
})
export class PagoDetalleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly prestamosService = inject(PrestamosService);
  private readonly clientesService = inject(ClientesService);
  private readonly pagosService = inject(PagosService);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(FormBuilder);

  private readonly prestamoId = Number(this.route.snapshot.paramMap.get('id'));

  protected readonly prestamo = signal<PrestamoResponse | null>(null);
  protected readonly clientes = signal<ClienteResponse[]>([]);
  protected readonly cuotas = signal<CuotaResponse[]>([]);
  protected readonly historial = signal<PagoResponse[]>([]);
  protected readonly loadingPrestamo = signal(false);
  protected readonly loading = signal(false);
  protected readonly pagando = signal(false);

  protected readonly metodoPagoOptions = [
    { label: 'Efectivo', value: 'EFECTIVO' },
    { label: 'Transferencia', value: 'TRANSFERENCIA' },
  ];

  protected readonly form = this.fb.nonNullable.group({
    metodoPago: this.fb.control<string | null>(null, Validators.required),
  });

  protected readonly cuotaPendiente = computed(
    () => this.cuotas().find((c) => c.estadoDesc === 'PENDIENTE') ?? null,
  );

  protected readonly cuotasPagadas = computed(
    () => this.cuotas().filter((c) => c.estadoDesc === 'PAGADO').length,
  );

  protected readonly progreso = computed(() => {
    const total = this.cuotas().length;
    return total === 0 ? 0 : Math.round((this.cuotasPagadas() / total) * 100);
  });

  protected readonly montoPagado = computed(() =>
    this.historial().reduce((total, pago) => total + pago.montoPagado, 0),
  );

  protected readonly montoPendiente = computed(() =>
    this.cuotas()
      .filter((c) => c.estadoDesc === 'PENDIENTE')
      .reduce((total, c) => total + c.monto, 0),
  );

  ngOnInit(): void {
    this.clientesService.listar({ size: 100 }).subscribe({
      next: (res) => this.clientes.set(res.data?.content ?? []),
      error: () => this.clientes.set([]),
    });
    this.loadingPrestamo.set(true);
    this.prestamosService.detalle(this.prestamoId).subscribe({
      next: (res) => {
        this.prestamo.set(res.data);
        this.loadingPrestamo.set(false);
      },
      error: () => this.loadingPrestamo.set(false),
    });
    this.cargarCuotas();
    this.cargarHistorial();
  }

  private cargarCuotas(): void {
    this.loading.set(true);
    this.pagosService.cuotas(this.prestamoId).subscribe({
      next: (res) => {
        this.cuotas.set(res.data ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private cargarHistorial(): void {
    this.pagosService.historial(this.prestamoId).subscribe({
      next: (res) => this.historial.set(res.data ?? []),
      error: () => this.historial.set([]),
    });
  }

  protected descargarEstadoPdf(): void {
    const p = this.prestamo();
    if (!p) {
      return;
    }

    const doc = crearReportePdf(`Estado del Prestamo #${p.prestamoId}`);
    const finCampos = agregarCampos(
      doc,
      [
        ['Cliente', clienteLabel(this.clientes(), p.clienteId)],
        ['Monto', p.monto.toFixed(2)],
        ['Cuota mensual', p.cuotaMensual.toFixed(2)],
        ['Estado del prestamo', p.estadoDesc],
      ],
      44,
    );

    autoTable(doc, {
      startY: finCampos + 4,
      head: [['Cuota', 'Vencimiento', 'Monto', 'Estado']],
      body: this.cuotas().map((c) => [
        c.numeroCuota,
        c.fechaVencimiento,
        c.monto.toFixed(2),
        c.estadoDesc,
      ]),
      headStyles: { fillColor: [79, 70, 229] },
    });

    const finCuotas = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
      .finalY;

    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    doc.text('Historial de pagos', 14, finCuotas + 10);

    autoTable(doc, {
      startY: finCuotas + 14,
      head: [['Cuota', 'Fecha de pago', 'Monto pagado', 'Metodo']],
      body: this.historial().map((pago) => [
        `#${pago.numeroCuota}`,
        pago.fechaPago,
        pago.montoPagado.toFixed(2),
        pago.metodoPago,
      ]),
      headStyles: { fillColor: [79, 70, 229] },
    });

    doc.save(`estado-prestamo-${p.prestamoId}.pdf`);
  }

  protected registrarPago(): void {
    const cuota = this.cuotaPendiente();
    if (!cuota || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.pagando.set(true);
    this.pagosService
      .pagar(this.prestamoId, {
        montoPagado: cuota.monto,
        metodoPago: this.form.getRawValue().metodoPago as string,
      })
      .subscribe({
        next: (res) => {
          this.pagando.set(false);
          this.form.reset();
          this.messageService.add({
            severity: 'success',
            summary: 'Pago registrado',
            detail: res.message,
          });
          this.cargarCuotas();
          this.cargarHistorial();
        },
        error: () => this.pagando.set(false),
      });
  }
}
