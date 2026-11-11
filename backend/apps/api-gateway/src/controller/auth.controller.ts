import { Body, Controller, Get, Inject, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { AccessTokenGuard } from '../auth/access-token.guard';
import type { AuthenticatedRequest } from '../auth/access-token.guard';

@ApiTags('Autenticación')
@Controller('auth')
export class GatewayAuthController {
  constructor(@Inject('AUTH_SERVICE') private readonly authClient: ClientProxy) {}

  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión y obtener un token de acceso' })
  login(@Body() body: { email: string; password: string }) {
    return firstValueFrom(
      this.authClient.send({ cmd: 'auth.login' }, body).pipe(timeout(10000)),
    );
  }

  @Get('perfil')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Obtener el usuario del token actual' })
  perfil(@Req() request: AuthenticatedRequest) {
    return request.user;
  }
}
