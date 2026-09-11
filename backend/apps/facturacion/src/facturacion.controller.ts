import { Controller, Get } from '@nestjs/common';
import { FacturacionService } from './facturacion.service';

@Controller()
export class FacturacionController {
  constructor(private readonly facturacionService: FacturacionService) {}

  @Get()
  getHello(): string {
    return this.facturacionService.getHello();
  }
}
