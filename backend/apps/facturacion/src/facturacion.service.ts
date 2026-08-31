import { Injectable } from '@nestjs/common';

@Injectable()
export class FacturacionService {
  getHello(): string {
    return 'Hello World!';
  }
}
