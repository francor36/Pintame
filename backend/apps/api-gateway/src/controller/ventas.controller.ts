import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiGatewayService } from '../services/api-gateway.service';

@ApiTags('Ventas')
@Controller('ventas')
export class VentasController {
  constructor(
    private readonly apiGatewayService: ApiGatewayService,
  ) {}

  @Get('prueba')
  @ApiOperation({ summary: 'Probar conexión con el microservicio de Ventas' })
  probarVentas() {
    return this.apiGatewayService.probarVentas();
  }
}