import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DatabaseModule } from './database/database.module';

import { Cliente } from './entities/cliente.entity';
import { CuentaCorriente } from './entities/cuenta-corriente.entity';

import { ClientesController } from './controller/clientes.controller';
import { ClientesService } from './services/clientes.service';

import { MovimientoSaldo } from './entities/movimiento-saldo.entity';
import { SaldoService } from './services/saldo.services';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    DatabaseModule,

    TypeOrmModule.forFeature([
      Cliente,
      MovimientoSaldo,
      CuentaCorriente,
    ]),
  ],

  controllers: [
    ClientesController,
  ],

  providers: [
    ClientesService,
    SaldoService
  ],
})
export class AppModule {}