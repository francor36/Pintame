import { Controller, Get, Inject, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { AdminGuard } from '../auth/admin.guard';

@ApiTags('Auditoría')
@ApiBearerAuth('access-token')
@UseGuards(AccessTokenGuard, AdminGuard)
@Controller('logs')
export class GatewayLogsController {
  constructor(@Inject('LOGS_SERVICE') private readonly logsClient: ClientProxy) {}

  @Get()
  @ApiOperation({ summary: 'Listar eventos recientes de auditoría (solo ADMIN)' })
  listar(@Query('limite') limite?: string) {
    return firstValueFrom(
      this.logsClient
        .send({ cmd: 'logs.listar' }, { limite: limite === undefined ? 50 : Number(limite) })
        .pipe(timeout(10000)),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar un evento de auditoría (solo ADMIN)' })
  obtener(@Param('id') id: string) {
    return firstValueFrom(
      this.logsClient.send({ cmd: 'logs.buscar' }, { id }).pipe(timeout(10000)),
    );
  }
}
