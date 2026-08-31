import { NestFactory } from '@nestjs/core';
import { VentasModule } from './ventas.module';

async function bootstrap() {
  const app = await NestFactory.create(VentasModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
