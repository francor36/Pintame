import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { AuthModule } from './auth.module';
import { RpcHttpExceptionFilter } from './rpc-http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.createMicroservice(AuthModule, {
    transport: Transport.TCP,
    options: {
      host: process.env.AUTH_HOST ?? 'localhost',
      port: Number(process.env.AUTH_PORT ?? 3006),
    },
  });
  app.useGlobalFilters(new RpcHttpExceptionFilter());
  await app.listen();
}
bootstrap();
