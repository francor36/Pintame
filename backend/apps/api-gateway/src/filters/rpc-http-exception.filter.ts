import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class RpcHttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const details = exception.getResponse();
      return response.status(status).json(
        typeof details === 'string'
          ? { statusCode: status, message: details }
          : details,
      );
    }

    const record = this.asRecord(exception);
    const nested = this.asRecord(record?.error);
    const rpcError = nested ?? record;
    const code = String(record?.code ?? rpcError?.code ?? '');
    const statusCode = Number(rpcError?.statusCode ?? rpcError?.status);
    const message = rpcError?.message;

    if (['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EHOSTUNREACH'].includes(code)) {
      return response.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'Un servicio interno no está disponible; intente nuevamente en unos segundos',
      });
    }

    if (
      Number.isInteger(statusCode) &&
      statusCode >= 400 &&
      statusCode <= 599 &&
      typeof message === 'string'
    ) {
      return response.status(statusCode).json({ statusCode, message });
    }

    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Error interno del servidor',
    });
  }

  private asRecord(value: unknown): Record<string, unknown> | undefined {
    return typeof value === 'object' && value !== null
      ? (value as Record<string, unknown>)
      : undefined;
  }
}
