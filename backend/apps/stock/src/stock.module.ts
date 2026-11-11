import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';
import { PrismaStockModule } from './database/prisma-stock.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaStockModule],
  controllers: [StockController],
  providers: [StockService],
})
export class StockModule {}
