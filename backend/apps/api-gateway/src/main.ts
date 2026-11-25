import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { ApiGatewayModule } from './api-gateway.module';
import { RpcHttpExceptionFilter } from './filters/rpc-http-exception.filter';

const configuredCorsOrigins = new Set(
  (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
);

function isLocalExpoWebOrigin(origin: string) {
  try {
    const url = new URL(origin);
    if (url.protocol !== 'http:' || !['8081', '8082'].includes(url.port)) {
      return false;
    }

    const host = url.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1') return true;

    const octets = host.split('.').map(Number);
    if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
      return false;
    }

    return (
      octets[0] === 10 ||
      (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
      (octets[0] === 192 && octets[1] === 168)
    );
  } catch {
    return false;
  }
}

async function bootstrap() {
  const app = await NestFactory.create(ApiGatewayModule);
  app.enableCors({
    origin: (origin, callback) => {
      const allowed =
        !origin ||
        configuredCorsOrigins.has(origin) ||
        (process.env.NODE_ENV !== 'production' && isLocalExpoWebOrigin(origin));
      callback(null, allowed);
    },
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  app.useGlobalFilters(new RpcHttpExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('Pintame API')
    .setDescription('Documentación interactiva de la API de Pintame')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('docs', app, document);

  await app.listen(
    process.env.API_GATEWAY_PORT ?? process.env.PORT ?? 3000,
  );
}

bootstrap();
