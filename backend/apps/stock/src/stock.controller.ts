import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { TipoMovimientoStock } from '@prisma/client-stock';
import { StockService } from './stock.service';

@Controller()
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @MessagePattern({ cmd: 'stock.productos.listar' })
  listarProductos() {
    return this.stockService.listarProductos();
  }

  @MessagePattern({ cmd: 'stock.productos.crear' })
  crearProducto(data: Parameters<StockService['crearProducto']>[0]) {
    return this.stockService.crearProducto(data);
  }

  @MessagePattern({ cmd: 'stock.productos.buscar' })
  buscarProducto(data: { id: number }) {
    return this.stockService.buscarProducto(data.id);
  }

  @MessagePattern({ cmd: 'stock.productos.actualizar' })
  actualizarProducto(data: {
    id: number;
    data: Parameters<StockService['actualizarProducto']>[1];
  }) {
    return this.stockService.actualizarProducto(data.id, data.data);
  }

  @MessagePattern({ cmd: 'stock.movimientos.crear' })
  registrarMovimiento(data: {
    productoId: number;
    tipo: TipoMovimientoStock;
    cantidad: number;
    motivo?: string;
    referencia?: string;
  }) {
    return this.stockService.registrarMovimiento(data);
  }

  @MessagePattern({ cmd: 'stock.movimientos.listar' })
  listarMovimientos(data: { productoId: number }) {
    return this.stockService.listarMovimientos(data.productoId);
  }
}
