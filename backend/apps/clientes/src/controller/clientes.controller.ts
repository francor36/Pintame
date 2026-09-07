import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';

import { ClientesService } from '../services/clientes.service';
import { SaldoService } from '../services/saldo.services';
import { CreateClienteDto } from '../dto/create-cliente.dto';

@Controller()
export class ClientesController {
  constructor(
    private readonly clientesService: ClientesService,
    private readonly saldoService: SaldoService,
  ) {}

  @MessagePattern({ cmd: 'clientes.listar' })
  listar() {
    return this.clientesService.listar();
  }

  @MessagePattern({ cmd: 'clientes.crear' })
  crear(data: CreateClienteDto) {
    return this.clientesService.crear(data);
  }

  @MessagePattern({ cmd: 'clientes.buscar' })
  buscar(data: { id: number }) {
    return this.clientesService.buscarPorId(data.id);
  }

  @MessagePattern({ cmd: 'saldo.generar-ntdc' })
  generarSaldoPorNtdc(data: {
    clienteId: number;
    monto: number;
    referencia: string;
    observacion?: string;
  }) {
    return this.saldoService.generarSaldoPorNtdc(
      data.clienteId,
      data.monto,
      data.referencia,
      data.observacion,
    );
  }

  @MessagePattern({ cmd: 'saldo.obtener' })
  obtenerSaldo(data: { clienteId: number }) {
    return this.saldoService.obtenerSaldo(
      data.clienteId,
    );
  }

  @MessagePattern({ cmd: 'saldo.consumir' })
  consumirSaldo(data: {
    clienteId: number;
    monto: number;
    referencia: string;
    observacion?: string;
  }) {
    return this.saldoService.consumirSaldo(
      data.clienteId,
      data.monto,
      data.referencia,
      data.observacion,
    );
  }

  @MessagePattern({ cmd: 'saldo.actualizar-vencimientos' })
  actualizarVencimientos(data: { clienteId: number }) {
    return this.saldoService.actualizarVencimientos(
      data.clienteId,
    );
  }
}