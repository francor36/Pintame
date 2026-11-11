import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { UsersService } from './users.service';

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @MessagePattern({ cmd: 'users.listar' })
  listar() {
    return this.usersService.listar();
  }

  @MessagePattern({ cmd: 'users.buscar' })
  buscar({ id }: { id: number }) {
    return this.usersService.obtener(id);
  }

  @MessagePattern({ cmd: 'users.buscar-email' })
  buscarEmail({ email }: { email: string }) {
    return this.usersService.buscarPorEmail(email);
  }

  @MessagePattern({ cmd: 'users.crear' })
  crear(input: { email: string; nombre: string; password: string; rol?: 'ADMIN' | 'CAJERO' }) {
    return this.usersService.crear(input);
  }

  @MessagePattern({ cmd: 'users.actualizar' })
  actualizar({ id, ...input }: {
    id: number;
    nombre?: string;
    rol?: 'ADMIN' | 'CAJERO';
    activo?: boolean;
  }) {
    return this.usersService.actualizar(id, input);
  }
}
