import { NestFactory } from '@nestjs/core';
import { FacturacionModule } from './facturacion.module';

async function bootstrap() {
  const app = await NestFactory.create(FacturacionModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
