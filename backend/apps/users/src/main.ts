import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { UsersModule } from './users.module';
import { RpcHttpExceptionFilter } from './rpc-http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.createMicroservice(UsersModule, {
    transport: Transport.TCP,
    options: {
      host: process.env.USERS_HOST ?? 'localhost',
      port: Number(process.env.USERS_PORT ?? 3007),
    },
  });
  app.useGlobalFilters(new RpcHttpExceptionFilter());
  await app.listen();
}
bootstrap();
