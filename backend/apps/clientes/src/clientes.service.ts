import { Injectable } from '@nestjs/common';

@Injectable()
export class ClientesService {
  getHello(): string {
    return 'Hello World!';
  }
}
