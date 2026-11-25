import { NestFactory } from '@nestjs/core';
import {
  Transport,
  MicroserviceOptions,
} from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';

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
          port: 3001,
        },
      },
    );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new RpcHttpExceptionFilter());
  await app.listen();
}

bootstrap();
