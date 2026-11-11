import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@prisma/client-stock';

@Injectable()
export class PrismaStockService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const connectionString = process.env.STOCK_DATABASE_URL;

    if (!connectionString) {
      throw new Error('Falta configurar STOCK_DATABASE_URL en el archivo .env');
    }

    super({ adapter: new PrismaMariaDb(connectionString) });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
