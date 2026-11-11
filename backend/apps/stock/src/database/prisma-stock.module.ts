import { Global, Module } from '@nestjs/common';
import { PrismaStockService } from './prisma-stock.service';

@Global()
@Module({
  providers: [PrismaStockService],
  exports: [PrismaStockService],
})
export class PrismaStockModule {}
