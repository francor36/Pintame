import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiGatewayService } from '../services/api-gateway.service';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { AdminGuard } from '../auth/admin.guard';
import type { AuthenticatedRequest } from '../auth/access-token.guard';

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
  listarVentas(@Req() request: AuthenticatedRequest, @Query('cajeroId') cajeroId?: string) {
    const requestedId = cajeroId === undefined ? undefined : Number(cajeroId);
    if (requestedId !== undefined && (!Number.isInteger(requestedId) || requestedId <= 0)) {
      throw new BadRequestException('El ID del cajero no es válido');
    }
    const ownerId = request.user?.rol === 'ADMIN' ? requestedId : request.user?.sub;
    return this.apiGatewayService.listarVentas(ownerId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una venta por ID' })
  @ApiParam({ name: 'id', example: 1 })
  buscarVenta(@Param('id', ParseIntPipe) id: number, @Req() request: AuthenticatedRequest) {
    return this.apiGatewayService.buscarVenta(id, request.user?.rol === 'ADMIN' ? undefined : request.user?.sub);
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
    @Req() request: AuthenticatedRequest,
    @Body()
    body: {
      detalles: Array<{ productoId: number; cantidad: number }>;
      observacion?: string;
      ubicacionLatitud?: number;
      ubicacionLongitud?: number;
    },
  ) {
    return this.apiGatewayService.crearVenta({
      ...body,
      usuarioId: request.user!.sub,
      usuarioNombre: request.user!.nombre,
      ubicacionLatitud: body.ubicacionLatitud,
      ubicacionLongitud: body.ubicacionLongitud,
    });
  }

  @Post(':id/confirmar')
  @ApiOperation({ summary: 'Confirmar una venta: descuenta Stock y registra el cobro en Caja' })
  confirmarVenta(@Param('id', ParseIntPipe) id: number, @Req() request: AuthenticatedRequest) {
    return this.apiGatewayService.confirmarVenta(id, request.user?.rol === 'ADMIN' ? undefined : request.user?.sub);
  }

  @Post(':id/reintentar-confirmacion')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Recuperar la confirmación de una venta interrumpida (solo ADMIN)' })
  reintentarConfirmacion(@Param('id', ParseIntPipe) id: number) {
    return this.apiGatewayService.reintentarConfirmacionVenta(id);
  }

  @Patch(':id/anular')
  @ApiOperation({ summary: 'Anular una venta pendiente' })
  anularVenta(@Param('id', ParseIntPipe) id: number, @Req() request: AuthenticatedRequest) {
    return this.apiGatewayService.anularVenta(id, request.user?.rol === 'ADMIN' ? undefined : request.user?.sub);
  }
}
