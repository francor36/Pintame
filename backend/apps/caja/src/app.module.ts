import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from '../../../prisma/src/database/prisma.module';

import { CajaController } from './controller/caja.controller';
import { CajaService } from './services/caja.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    PrismaModule,
  ],

  controllers: [
    CajaController,
  ],

  providers: [
    CajaService,
  ],
})
export class AppModule {}