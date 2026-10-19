import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { VentasService } from '../services/ventas.service';

@Controller()
export class VentasController {
  constructor(
    private readonly ventasService: VentasService,
  ) {}

  @MessagePattern({ cmd: 'ventas.prueba' })
  getHello(): string {
    return this.ventasService.getHello();
  }
}