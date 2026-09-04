import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DatabaseModule } from './database/database.module';
import { Cliente } from './entities/cliente.entity';
import { ClientesController } from './controller/clientes.controller';
import { ClientesService } from './services/clientes.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    DatabaseModule,

    TypeOrmModule.forFeature([Cliente]),
  ],

  controllers: [ClientesController],

  providers: [ClientesService],
})
export class AppModule {}