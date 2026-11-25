import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { FacturacionModule } from './facturacion.module';
import { RpcHttpExceptionFilter } from './rpc-http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.createMicroservice(FacturacionModule, {
    transport: Transport.TCP,
    options: {
      host: process.env.FACTURACION_HOST ?? 'localhost',
      port: Number(process.env.FACTURACION_PORT ?? 3005),
    },
  });
  app.useGlobalFilters(new RpcHttpExceptionFilter());
  await app.listen();
}
bootstrap();
