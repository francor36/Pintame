import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { StockModule } from './stock.module';
import { RpcHttpExceptionFilter } from './rpc-http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    StockModule,
    {
      transport: Transport.TCP,
      options: {
        host: process.env.STOCK_HOST ?? 'localhost',
        port: Number(process.env.STOCK_PORT ?? 3003),
      },
    },
  );

  app.useGlobalFilters(new RpcHttpExceptionFilter());
  await app.listen();
}
bootstrap();
