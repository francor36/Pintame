
import { Global, Module } from '@nestjs/common';
import { PrismaVentasService } from './prisma-ventas.service';

@Global()
@Module({
  providers: [PrismaVentasService],
  exports: [PrismaVentasService],
})
export class PrismaVentasModule {}
