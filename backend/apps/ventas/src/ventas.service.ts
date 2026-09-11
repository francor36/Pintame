import { Injectable } from '@nestjs/common';

@Injectable()
export class VentasService {
  getHello(): string {
    return 'Hello World!';
  }
}
