//Es el punto de arranque global de todo el servidor backend.

import { NestFactory } from '@nestjs/core';
import { AuthModule } from './auth.module';

async function bootstrap() {
  const app = await NestFactory.create(AuthModule);

  // 1. Habilitar CORS para permitir peticiones desde tu frontend de React
  app.enableCors({
    origin: '*', // O podés poner 'http://localhost:5173' por seguridad
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // 2. Opcional: Prefijo global para las rutas (ej: /api) si querés que queden como /api/auth/...
  // app.setGlobalPrefix('api');

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();