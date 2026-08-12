import { DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CardComponent } from '@coreui/angular';
import autoTable from 'jspdf-autotable';
import { MessageService, PrimeTemplate } from 'primeng/api';
import { Button } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';

import { ClientesService } from '../clientes/clientes.service';
import { ClienteResponse, PrestamoDetalleResponse } from '../shared/models/api.models';
import { agregarCampos, crearReportePdf } from '../shared/pdf/pdf-report.util';
import { ClienteLabelPipe, clienteLabel } from '../shared/pipes/cliente-label.pipe';
import { PrestamosService } from './prestamos.service';

@Component({
  selector: 'app-prestamo-detalle',
  imports: [
    RouterLink,
    CardComponent,
    Button,
    TableModule,
    Tag,
    PrimeTemplate,
    DecimalPipe,
    ClienteLabelPipe,
  ],
  templateUrl: './prestamo-detalle.component.html',
})
export class PrestamoDetalleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly prestamosService = inject(PrestamosService);
  private readonly clientesService = inject(ClientesService);
  private readonly messageService = inject(MessageService);

  private readonly prestamoId = Number(this.route.snapshot.paramMap.get('id'));

  protected readonly prestamo = signal<PrestamoDetalleResponse | null>(null);
  protected readonly clientes = signal<ClienteResponse[]>([]);
  protected readonly loading = signal(false);
  protected readonly aprobando = signal(false);

  ngOnInit(): void {
    this.clientesService.listar({ size: 100 }).subscribe({
      next: (res) => this.clientes.set(res.data?.content ?? []),
      error: () => this.clientes.set([]),
    });
    this.cargarDetalle();
  }

  private cargarDetalle(): void {
    this.loading.set(true);
    this.prestamosService.detalle(this.prestamoId).subscribe({
      next: (res) => {
        this.prestamo.set(res.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected verPagos(): void {
    this.router.navigate(['/pagos', this.prestamoId]);
  }

  protected descargarPdf(): void {
    const p = this.prestamo();
    if (!p) {
      return;
    }

    const doc = crearReportePdf(`Reporte de Prestamo #${p.prestamoId}`);
    const finY = agregarCampos(
      doc,
      [
        ['Cliente', clienteLabel(this.clientes(), p.clienteId)],
        ['Monto', p.monto.toFixed(2)],
        ['Tasa anual', `${p.tasaInteres.toFixed(2)}%`],
        ['Plazo', `${p.plazoMeses} meses`],
        ['Cuota mensual', p.cuotaMensual.toFixed(2)],
        ['Total interes', p.totalInteres.toFixed(2)],
        ['Total a pagar', p.totalPagar.toFixed(2)],
        ['Estado', p.estadoDesc],
        ['Fecha aprobacion', p.fechaAprobacion ?? '-'],
      ],
      44,
    );

    autoTable(doc, {
      startY: finY + 4,
      head: [['Cuota', 'Fecha de pago', 'Capital', 'Interes', 'Cuota', 'Saldo']],
      body: p.cronograma.map((c) => [
        c.numeroCuota,
        c.fechaPago,
        c.capital.toFixed(2),
        c.interes.toFixed(2),
        c.cuota.toFixed(2),
        c.saldo.toFixed(2),
      ]),
      headStyles: { fillColor: [79, 70, 229] },
    });

    doc.save(`prestamo-${p.prestamoId}.pdf`);
  }

  protected aprobar(): void {
    this.aprobando.set(true);
    this.prestamosService.aprobar(this.prestamoId).subscribe({
      next: (res) => {
        this.aprobando.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Prestamo aprobado',
          detail: res.message,
        });
        this.cargarDetalle();
      },
      error: () => this.aprobando.set(false),
    });
  }
}
