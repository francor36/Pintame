import { Module } from '@nestjs/common';
import { CajaController } from './caja.controller';
import { CajaService } from './caja.service';

@Module({
  imports: [],
  controllers: [CajaController],
  providers: [CajaService],
})
export class CajaModule {}
