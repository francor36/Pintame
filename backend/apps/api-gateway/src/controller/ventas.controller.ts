import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiGatewayService } from '../services/api-gateway.service';
import { AccessTokenGuard } from '../auth/access-token.guard';

@ApiTags('Ventas')
@ApiBearerAuth('access-token')
@UseGuards(AccessTokenGuard)
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

  @Get()
  @ApiOperation({ summary: 'Listar ventas con sus detalles' })
  listarVentas() {
    return this.apiGatewayService.listarVentas();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una venta por ID' })
  @ApiParam({ name: 'id', example: 1 })
  buscarVenta(@Param('id', ParseIntPipe) id: number) {
    return this.apiGatewayService.buscarVenta(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear una venta pendiente con precios actuales de Stock' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        detalles: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              productoId: { type: 'integer', example: 1 },
              cantidad: { type: 'number', example: 2 },
            },
            required: ['productoId', 'cantidad'],
          },
        },
        observacion: { type: 'string', example: 'Venta mostrador' },
      },
      required: ['detalles'],
    },
  })
  crearVenta(
    @Body()
    body: {
      detalles: Array<{ productoId: number; cantidad: number }>;
      observacion?: string;
    },
  ) {
    return this.apiGatewayService.crearVenta(body);
  }

  @Post(':id/confirmar')
  @ApiOperation({ summary: 'Confirmar una venta: descuenta Stock y registra el cobro en Caja' })
  confirmarVenta(@Param('id', ParseIntPipe) id: number) {
    return this.apiGatewayService.confirmarVenta(id);
  }

  @Patch(':id/anular')
  @ApiOperation({ summary: 'Anular una venta pendiente' })
  anularVenta(@Param('id', ParseIntPipe) id: number) {
    return this.apiGatewayService.anularVenta(id);
  }
}
