
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaVentasModule } from '../database/prisma-ventas.module';
import { VentasController } from './controllers/ventas.controller';
import { VentasService } from './services/ventas.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaVentasModule,
  ],
  controllers: [VentasController],
  providers: [VentasService],
})
export class VentasModule {}
