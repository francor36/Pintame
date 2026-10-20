import { Injectable } from '@nestjs/common';

@Injectable()
export class CajaService {
  getHello(): string {
    return 'Hello World!';
  }
}
