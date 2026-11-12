import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import type { Request, Response } from 'express';
import { Observable, timeout, tap } from 'rxjs';

type RequestWithUser = Request & {
  user?: { sub?: number; rol?: string };
  route?: { path?: string };
};

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(@Inject('LOGS_SERVICE') private readonly logsClient: ClientProxy) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithUser>();
    const response = http.getResponse<Response>();
    const started = Date.now();

    return next.handle().pipe(
      tap({
        next: () => this.registrar(request, response.statusCode, Date.now() - started),
        error: (error: unknown) => {
          const status = error instanceof HttpException ? error.getStatus() : 500;
          this.registrar(request, status, Date.now() - started);
        },
      }),
    );
  }

  private registrar(request: RequestWithUser, statusCode: number, duracionMs: number) {
    const nivel = statusCode >= 500 ? 'ERROR' : statusCode >= 400 ? 'WARN' : 'INFO';
    this.logsClient
      .send(
        { cmd: 'logs.registrar' },
        {
          servicio: 'api-gateway',
          nivel,
          mensaje: 'Petición HTTP procesada',
          ruta: request.route?.path ?? request.path,
          metodo: request.method,
          statusCode,
          duracionMs,
          usuarioId: request.user?.sub,
          usuarioRol: request.user?.rol,
        },
      )
      .pipe(timeout(2000))
      .subscribe({ error: () => undefined });
  }
}
