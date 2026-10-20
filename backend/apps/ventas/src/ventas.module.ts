import { Module } from '@nestjs/common';
import { VentasController } from './ventas.controller';
import { VentasService } from './ventas.service';

@Module({
  imports: [],
  controllers: [VentasController],
  providers: [VentasService],
})
export class VentasModule {}
