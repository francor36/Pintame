
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';

import { PrismaVentasModule } from '../database/prisma-ventas.module';
import { VentasController } from './controllers/ventas.controller';
import { VentasService } from './services/ventas.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ClientsModule.register([
      {
        name: 'STOCK_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.STOCK_HOST ?? 'localhost',
          port: Number(process.env.STOCK_PORT ?? 3003),
        },
      },
      {
        name: 'CAJA_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.CAJA_HOST ?? 'localhost',
          port: Number(process.env.CAJA_PORT ?? 3004),
        },
      },
    ]),
    PrismaVentasModule,
  ],
  controllers: [VentasController],
  providers: [VentasService],
})
export class VentasModule {}
