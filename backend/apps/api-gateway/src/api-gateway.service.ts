import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class ApiGatewayService {
  constructor(
    @Inject('CLIENTES_SERVICE')
    private readonly clientesClient: ClientProxy,
  ) {}

  getHello() {
    return this.clientesClient.send(
      { cmd: 'clientes.listar' },
      {},
    );
  }
}