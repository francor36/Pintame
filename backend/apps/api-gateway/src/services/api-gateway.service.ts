import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class ApiGatewayService {
  constructor(
    @Inject('CLIENTES_SERVICE')
    private readonly clientesClient: ClientProxy,
  ) { }

  listarClientes() {
    return this.clientesClient.send(
      { cmd: 'clientes.listar' },
      {},
    );
  }

  obtenerSaldo(clienteId: number) {
    return this.clientesClient.send(
      { cmd: 'saldo.obtener' },
      {
        clienteId,
      },
    );
  }

  generarSaldoPorNtdc(
    clienteId: number,
    monto: number,
    referencia: string,
    observacion?: string,
  ) {
    return this.clientesClient.send(
      { cmd: 'saldo.generar-ntdc' },
      {
        clienteId,
        monto,
        referencia,
        observacion,
      },
    );
  }

  consumirSaldo(
    clienteId: number,
    monto: number,
    referencia: string,
    observacion?: string,
  ) {
    return this.clientesClient.send(
      { cmd: 'saldo.consumir' },
      {
        clienteId,
        monto,
        referencia,
        observacion,
      },
    );
  }

  actualizarVencimientos(clienteId: number) {
    return this.clientesClient.send(
      { cmd: 'saldo.actualizar-vencimientos' },
      {
        clienteId,
      },
    );
  }

  crearCliente(data: {
    dni: string;
    nombre: string;
    apellido: string;
    email?: string;
    telefono?: string;
    direccion?: string;
  }) {
    return this.clientesClient.send(
      { cmd: 'clientes.crear' },
      data,
    );
  }
  buscarCliente(clienteId: number) {
    return this.clientesClient.send(
      { cmd: 'clientes.buscar' },
      {
        id: clienteId,
      },
    );
  }
  desactivarCliente(clienteId: number) {
    return this.clientesClient.send(
      { cmd: 'clientes.desactivar' },
      { id: clienteId },
    );
  }

  activarCliente(clienteId: number) {
    return this.clientesClient.send(
      { cmd: 'clientes.activar' },
      { id: clienteId },
    );
  }
}
