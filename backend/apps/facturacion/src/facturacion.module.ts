import { Module } from '@nestjs/common';
import { FacturacionController } from './facturacion.controller';
import { FacturacionService } from './facturacion.service';

@Module({
  imports: [],
  controllers: [FacturacionController],
  providers: [FacturacionService],
})
export class FacturacionModule {}
