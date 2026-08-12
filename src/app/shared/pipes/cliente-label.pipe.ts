import { Pipe, PipeTransform } from '@angular/core';

import { ClienteResponse } from '../models/api.models';

export function clienteLabel(clientes: ClienteResponse[], clienteId: number): string {
  const cliente = clientes.find((c) => c.clienteId === clienteId);
  return cliente
    ? `${cliente.nombres} ${cliente.apellidos} (${cliente.numeroDocumento})`
    : `#${clienteId}`;
}

@Pipe({ name: 'clienteLabel' })
export class ClienteLabelPipe implements PipeTransform {
  transform(clienteId: number, clientes: ClienteResponse[]): string {
    return clienteLabel(clientes, clienteId);
  }
}
