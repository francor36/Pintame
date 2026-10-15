import { NestFactory } from '@nestjs/core';
import {
  MicroserviceOptions,
  Transport,
} from '@nestjs/microservices';

import { VentasModule } from './ventas.module';

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

  await app.listen();
}

bootstrap();