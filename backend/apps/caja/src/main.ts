import { NestFactory } from '@nestjs/core';
import { CajaModule } from './caja.module';

async function bootstrap() {
  const app = await NestFactory.create(CajaModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
