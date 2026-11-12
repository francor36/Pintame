import 'dotenv/config';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { createPool } from 'mariadb';
import { FacturacionController } from './facturacion.controller';
import { FacturacionService } from './facturacion.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ClientsModule.register([
      {
        name: 'VENTAS_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.VENTAS_HOST ?? 'localhost',
          port: Number(process.env.VENTAS_PORT ?? 3002),
        },
      },
    ]),
  ],
  controllers: [FacturacionController],
  providers: [
    {
      provide: 'FACTURACION_DB',
      useFactory: () => createPool({
        host: process.env.MYSQL_HOST ?? 'localhost',
        port: Number(process.env.MYSQL_PORT ?? 3306),
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DB,
        connectionLimit: 5,
      }),
    },
    FacturacionService,
  ],
})
export class FacturacionModule {}
