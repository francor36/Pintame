import { NestFactory } from '@nestjs/core';
import {
  MicroserviceOptions,
  Transport,
} from '@nestjs/microservices';

import { AppModule } from './app.module';
import { RpcHttpExceptionFilter } from './rpc-http-exception.filter';

async function bootstrap() {
  const app =
    await NestFactory.createMicroservice<MicroserviceOptions>(
      AppModule,
      {
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 3004,
        },
      },
    );

  app.useGlobalFilters(new RpcHttpExceptionFilter());
  await app.listen();
}

bootstrap();
