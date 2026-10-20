import { Controller, Get } from '@nestjs/common';
import { VentasService } from './ventas.service';

@Controller()
export class VentasController {
  constructor(private readonly ventasService: VentasService) {}

  @Get()
  getHello(): string {
    return this.ventasService.getHello();
  }
}
