import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
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
