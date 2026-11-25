import {
  ArgumentsHost,
  Catch,
  HttpException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';

@Catch(HttpException)
export class RpcHttpExceptionFilter {
  catch(exception: HttpException, _host: ArgumentsHost): Observable<never> {
    const statusCode = exception.getStatus();
    const response = exception.getResponse();
    const payload = typeof response === 'string'
      ? { statusCode, message: response }
      : { ...(response as Record<string, unknown>), statusCode };
    return throwError(() => payload);
  }
}

export function rpcErrorToHttpException(error: unknown): HttpException | undefined {
  const record = asRecord(error);
  const details = asRecord(record?.error) ?? record;
  const statusCode = Number(details?.statusCode ?? details?.status);
  const message = details?.message;

  if (Number.isInteger(statusCode) && statusCode >= 400 && statusCode <= 599) {
    return new HttpException(
      typeof message === 'string' ? message : (details ?? 'Error del servicio interno'),
      statusCode,
    );
  }

  const code = String(record?.code ?? details?.code ?? '');
  if (['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EHOSTUNREACH'].includes(code)) {
    return new ServiceUnavailableException('Un servicio interno no está disponible');
  }
  return undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}
