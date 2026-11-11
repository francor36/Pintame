import { Controller, HttpException } from '@nestjs/common';
import { MessagePattern, RpcException } from '@nestjs/microservices';
import { VentasService } from '../services/ventas.service';
import type { CrearVentaInput } from '../services/ventas.service';

@Controller()
export class VentasController {
  constructor(
    private readonly ventasService: VentasService,
  ) {}

  @MessagePattern({ cmd: 'ventas.prueba' })
  getHello(): string {
    return this.ventasService.getHello();
  }

  @MessagePattern({ cmd: 'ventas.listar' })
  listarVentas() {
    return this.handle(() => this.ventasService.listarVentas());
  }

  @MessagePattern({ cmd: 'ventas.buscar' })
  buscarVenta(data: { id: number }) {
    return this.handle(() => this.ventasService.buscarVenta(data.id));
  }

  @MessagePattern({ cmd: 'ventas.crear' })
  crearVenta(data: CrearVentaInput) {
    return this.handle(() => this.ventasService.crearVenta(data));
  }

  @MessagePattern({ cmd: 'ventas.confirmar' })
  confirmarVenta(data: { id: number }) {
    return this.handle(() => this.ventasService.confirmarVenta(data.id));
  }

  @MessagePattern({ cmd: 'ventas.anular' })
  anularVenta(data: { id: number }) {
    return this.handle(() => this.ventasService.anularVenta(data.id));
  }

  private async handle<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof HttpException) {
        throw new RpcException({
          statusCode: error.getStatus(),
          message: error.message,
        });
      }
      throw error;
    }
  }
}
