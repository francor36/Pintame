import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { FacturacionModule } from './facturacion.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice(FacturacionModule, {
    transport: Transport.TCP,
    options: {
      host: process.env.FACTURACION_HOST ?? 'localhost',
      port: Number(process.env.FACTURACION_PORT ?? 3005),
    },
  });
  await app.listen();
}
bootstrap();
