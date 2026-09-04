import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';

import { ClientesService } from '../services/clientes.service';

@Controller()
export class ClientesController {
  constructor(
    private readonly clientesService: ClientesService,
  ) {}

  @MessagePattern({ cmd: 'clientes.listar' })
  listar() {
    return this.clientesService.listar();
  }
}