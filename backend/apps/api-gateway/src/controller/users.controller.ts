import {
  Body,
  BadRequestException,
  Controller,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { AdminGuard } from '../auth/admin.guard';
import { AccessTokenGuard } from '../auth/access-token.guard';
import type { AuthenticatedRequest } from '../auth/access-token.guard';

@ApiTags('Usuarios')
@ApiBearerAuth('access-token')
@UseGuards(AccessTokenGuard, AdminGuard)
@Controller('users')
export class GatewayUsersController {
  constructor(@Inject('USERS_SERVICE') private readonly usersClient: ClientProxy) {}

  @Get()
  @ApiOperation({ summary: 'Listar usuarios (solo ADMIN)' })
  listar() {
    return firstValueFrom(
      this.usersClient.send({ cmd: 'users.listar' }, {}).pipe(timeout(10000)),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener usuario por ID (solo ADMIN)' })
  obtener(@Param('id', ParseIntPipe) id: number) {
    return firstValueFrom(
      this.usersClient.send({ cmd: 'users.buscar' }, { id }).pipe(timeout(10000)),
    );
  }

  @Post()
  @ApiOperation({ summary: 'Crear usuario (solo ADMIN); rol predeterminado CAJERO' })
  crear(@Body() body: { email: string; nombre: string; password: string; rol?: 'ADMIN' | 'CAJERO' }) {
    return firstValueFrom(
      this.usersClient.send({ cmd: 'users.crear' }, body).pipe(timeout(10000)),
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar datos, estado o contraseña (solo ADMIN)' })
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { nombre?: string; rol?: 'ADMIN' | 'CAJERO'; activo?: boolean; password?: string },
    @Req() request: AuthenticatedRequest,
  ) {
    if (id === request.user?.sub && (body.activo === false || body.rol === 'CAJERO')) {
      throw new BadRequestException('No podés desactivar tu propio usuario ni quitarte el rol ADMIN');
    }
    return firstValueFrom(
      this.usersClient
        .send({ cmd: 'users.actualizar' }, { id, ...body })
        .pipe(timeout(10000)),
    );
  }
}
