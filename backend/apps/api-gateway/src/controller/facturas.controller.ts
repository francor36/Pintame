import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { AccessTokenGuard } from '../auth/access-token.guard';

@ApiTags('Facturación interna')
@ApiBearerAuth('access-token')
@UseGuards(AccessTokenGuard)
@Controller('facturas')
export class FacturasController {
  constructor(@Inject('FACTURACION_SERVICE') private readonly facturacionClient: ClientProxy) {}

  @Get()
  @ApiOperation({ summary: 'Listar los últimos 200 comprobantes internos B' })
  listar() {
    return firstValueFrom(
      this.facturacionClient.send({ cmd: 'facturacion.listar' }, {}).pipe(timeout(10000)),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un comprobante interno por ID' })
  obtener(@Param('id', ParseIntPipe) id: number) {
    return firstValueFrom(
      this.facturacionClient.send({ cmd: 'facturacion.buscar' }, { id }).pipe(timeout(10000)),
    );
  }

  @Get('ventas/:ventaId')
  @ApiOperation({ summary: 'Obtener el comprobante de una venta' })
  porVenta(@Param('ventaId', ParseIntPipe) ventaId: number) {
    return firstValueFrom(
      this.facturacionClient
        .send({ cmd: 'facturacion.venta' }, { ventaId })
        .pipe(timeout(10000)),
    );
  }

  @Post('ventas/:ventaId')
  @ApiOperation({ summary: 'Emitir un comprobante B interno para una venta pagada; no conecta con ARCA' })
  emitir(
    @Param('ventaId', ParseIntPipe) ventaId: number,
    @Body() body: { clienteNombre?: string; clienteDocumento?: string; observacion?: string },
  ) {
    return firstValueFrom(
      this.facturacionClient
        .send({ cmd: 'facturacion.emitir' }, { ventaId, ...(body ?? {}) })
        .pipe(timeout(10000)),
    );
  }
}
