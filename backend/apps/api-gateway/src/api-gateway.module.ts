import 'dotenv/config';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { APP_INTERCEPTOR } from '@nestjs/core';
import {
  ClientsModule,
  Transport,
} from '@nestjs/microservices';

import { ApiGatewayController } from './controller/api-gateway.controller';
import { CajaController } from './controller/caja.controller';
import { ApiGatewayService } from './services/api-gateway.service';
import { VentasController } from './controller/ventas.controller';
import { StockController } from './controller/stock.controller';
import { GatewayAuthController } from './controller/auth.controller';
import { GatewayUsersController } from './controller/users.controller';
import { FacturasController } from './controller/facturas.controller';
import { GatewayLogsController } from './controller/logs.controller';
import { AuditLogInterceptor } from './interceptors/audit-log.interceptor';
import { AccessTokenGuard } from './auth/access-token.guard';
import { AdminGuard } from './auth/admin.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.register({ secret: process.env.JWT_SECRET ?? 'not-configured' }),
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

      // STOCK
      {
        name: 'STOCK_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.STOCK_HOST ?? 'localhost',
          port: Number(process.env.STOCK_PORT ?? 3003),
        },
      },
      {
        name: 'AUTH_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.AUTH_HOST ?? 'localhost',
          port: Number(process.env.AUTH_PORT ?? 3006),
        },
      },
      {
        name: 'USERS_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.USERS_HOST ?? 'localhost',
          port: Number(process.env.USERS_PORT ?? 3007),
        },
      },
      {
        name: 'FACTURACION_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.FACTURACION_HOST ?? 'localhost',
          port: Number(process.env.FACTURACION_PORT ?? 3005),
        },
      },
      {
        name: 'LOGS_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.LOGS_HOST ?? 'localhost',
          port: Number(process.env.LOGS_PORT ?? 3008),
        },
      },
    ]),
  ],

  controllers: [
    ApiGatewayController,
    CajaController,
    VentasController,
    StockController,
    GatewayAuthController,
    GatewayUsersController,
    FacturasController,
    GatewayLogsController,
  ],

  providers: [
    ApiGatewayService,
    AccessTokenGuard,
    AdminGuard,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
})
export class ApiGatewayModule {}
