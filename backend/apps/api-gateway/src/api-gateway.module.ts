import { Module } from '@nestjs/common';
import {
  ClientsModule,
  Transport,
} from '@nestjs/microservices';

import { ApiGatewayController } from './controller/api-gateway.controller';
import { CajaController } from './controller/caja.controller';
import { ApiGatewayService } from './services/api-gateway.service';
import { VentasController } from './controller/ventas.controller';

@Module({
  imports: [
    ClientsModule.register([
      // CLIENTES
      {
        name: 'CLIENTES_SERVICE',
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 3001,
        },
      },

      // VENTAS
      {
        name: 'VENTAS_SERVICE',
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 3002,
        },
      },

      // CAJA
      {
        name: 'CAJA_SERVICE',
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 3004,
        },
      },
    ]),
  ],

  controllers: [
    ApiGatewayController,
    CajaController,
    VentasController,
  ],

  providers: [
    ApiGatewayService,
  ],
})
export class ApiGatewayModule {}