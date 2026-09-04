import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ApiGatewayService } from './api-gateway.service';

@ApiTags('Clientes')
@Controller('clientes')
export class ApiGatewayController {
  constructor(
    private readonly apiGatewayService: ApiGatewayService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Obtener información del microservicio de clientes',
  })
  @ApiResponse({
    status: 200,
    description: 'Respuesta obtenida correctamente',
  })
  getHello() {
    return this.apiGatewayService.getHello();
  }
}