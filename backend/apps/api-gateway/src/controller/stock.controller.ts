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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiGatewayService } from '../services/api-gateway.service';
import { AccessTokenGuard } from '../auth/access-token.guard';

@ApiTags('Stock')
@ApiBearerAuth('access-token')
@UseGuards(AccessTokenGuard)
@Controller('stock')
export class StockController {
  constructor(private readonly apiGatewayService: ApiGatewayService) {}

  @Get('productos')
  @ApiOperation({ summary: 'Listar productos del inventario' })
  listarProductos() {
    return this.apiGatewayService.listarProductos();
  }

  @Post('productos')
  @ApiOperation({ summary: 'Crear un producto' })
  crearProducto(@Body() body: Record<string, unknown>) {
    return this.apiGatewayService.crearProducto(body);
  }

  @Get('productos/:id')
  @ApiOperation({ summary: 'Obtener un producto y sus últimos movimientos' })
  buscarProducto(@Param('id', ParseIntPipe) id: number) {
    return this.apiGatewayService.buscarProducto(id);
  }

  @Patch('productos/:id')
  @ApiOperation({ summary: 'Actualizar los datos de un producto' })
  actualizarProducto(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Record<string, unknown>,
  ) {
    return this.apiGatewayService.actualizarProducto(id, body);
  }

  @Post('productos/:id/movimientos')
  @ApiOperation({ summary: 'Registrar ingreso, egreso o ajuste de stock' })
  registrarMovimiento(
    @Param('id', ParseIntPipe) productoId: number,
    @Body()
    body: {
      tipo: 'INGRESO' | 'EGRESO' | 'AJUSTE';
      cantidad: number;
      motivo?: string;
      referencia?: string;
    },
  ) {
    return this.apiGatewayService.registrarMovimiento({ ...body, productoId });
  }

  @Get('productos/:id/movimientos')
  @ApiOperation({ summary: 'Listar los movimientos de un producto' })
  listarMovimientos(@Param('id', ParseIntPipe) productoId: number) {
    return this.apiGatewayService.listarMovimientos(productoId);
  }
}
