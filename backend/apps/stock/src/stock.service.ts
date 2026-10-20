import { Injectable } from '@nestjs/common';

@Injectable()
export class StockService {
  getHello(): string {
    return 'Hello World!';
  }
}
