import { Controller, Get } from '@nestjs/common';
import { CajaService } from './caja.service';

@Controller()
export class CajaController {
  constructor(private readonly cajaService: CajaService) {}

  @Get()
  getHello(): string {
    return this.cajaService.getHello();
  }
}
