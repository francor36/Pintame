import { NestFactory } from '@nestjs/core';
import {
  MicroserviceOptions,
  Transport,
} from '@nestjs/microservices';

import { VentasModule } from './ventas.module';
import { RpcHttpExceptionFilter } from './rpc-http-exception.filter';

async function bootstrap() {
  const app =
    await NestFactory.createMicroservice<MicroserviceOptions>(
      VentasModule,
      {
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 3002,
        },
      },
    );

  app.useGlobalFilters(new RpcHttpExceptionFilter());
  await app.listen();
}

bootstrap();
