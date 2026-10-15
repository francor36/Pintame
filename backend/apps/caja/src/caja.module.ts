import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DatabaseModule } from '../database/database.module';

import { Caja } from './entities/caja.entity';
import { MovimientoCaja } from './entities/movimiento-caja.entity';

import { CajaController } from './controller/caja.controller';
import { CajaService } from './services/caja.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    DatabaseModule,

    TypeOrmModule.forFeature([
      Caja,
      MovimientoCaja,
    ]),
  ],

  controllers: [
    CajaController,
  ],

  providers: [
    CajaService,
  ],
})
export class AppModule {}