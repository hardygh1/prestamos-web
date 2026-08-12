import { DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CardComponent } from '@coreui/angular';
import { ConfirmationService, MessageService, PrimeTemplate } from 'primeng/api';
import { Button } from 'primeng/button';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';

import { ClientesService } from '../clientes/clientes.service';
import { ClienteResponse, CotizacionDetalleResponse } from '../shared/models/api.models';
import { ClienteLabelPipe } from '../shared/pipes/cliente-label.pipe';
import { CotizacionesService } from './cotizaciones.service';

@Component({
  selector: 'app-cotizacion-detalle',
  imports: [
    RouterLink,
    CardComponent,
    Button,
    ConfirmDialog,
    TableModule,
    Tag,
    PrimeTemplate,
    DecimalPipe,
    ClienteLabelPipe,
  ],
  templateUrl: './cotizacion-detalle.component.html',
})
export class CotizacionDetalleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cotizacionesService = inject(CotizacionesService);
  private readonly clientesService = inject(ClientesService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  private readonly cotizacionId = Number(this.route.snapshot.paramMap.get('id'));

  protected readonly cotizacion = signal<CotizacionDetalleResponse | null>(null);
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
    this.cotizacionesService.detalle(this.cotizacionId).subscribe({
      next: (res) => {
        this.cotizacion.set(res.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected aprobar(): void {
    this.aprobando.set(true);
    this.cotizacionesService.aprobar(this.cotizacionId).subscribe({
      next: (res) => {
        this.aprobando.set(false);
        const prestamo = res.data;
        this.messageService.add({
          severity: 'success',
          summary: 'Cotizacion aprobada',
          detail: res.message,
        });
        if (prestamo) {
          this.router.navigate(['/prestamos', prestamo.prestamoId]);
        }
      },
      error: () => this.aprobando.set(false),
    });
  }

  protected confirmarEliminar(): void {
    const c = this.cotizacion();
    if (!c) {
      return;
    }
    this.confirmationService.confirm({
      header: 'Anular cotizacion',
      message: `¿Anular la cotizacion #${c.cotizacionId}? Esta accion no se puede deshacer.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Anular',
      rejectLabel: 'Cancelar',
      acceptButtonProps: { severity: 'danger' },
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () => this.eliminar(),
    });
  }

  private eliminar(): void {
    this.cotizacionesService.eliminar(this.cotizacionId).subscribe({
      next: (res) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Cotizacion eliminada',
          detail: res.message,
        });
        this.router.navigate(['/cotizaciones']);
      },
    });
  }
}
