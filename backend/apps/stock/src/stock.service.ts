import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TipoMovimientoStock } from '@prisma/client-stock';
import { PrismaStockService } from './database/prisma-stock.service';

type ProductoInput = {
  codigo: string;
  nombre: string;
  descripcion?: string;
  precioCosto: number;
  precioVenta: number;
  stockMinimo?: number;
};

type MovimientoInput = {
  productoId: number;
  tipo: TipoMovimientoStock;
  cantidad: number;
  motivo?: string;
  referencia?: string;
};

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaStockService) {}

  listarProductos() {
    return this.prisma.producto.findMany({ orderBy: { nombre: 'asc' } });
  }

  crearProducto(data: ProductoInput) {
    return this.prisma.producto.create({
      data: {
        codigo: data.codigo,
        nombre: data.nombre,
        descripcion: data.descripcion,
        precioCosto: data.precioCosto,
        precioVenta: data.precioVenta,
        stockMinimo: data.stockMinimo ?? 0,
      },
    });
  }

  async buscarProducto(id: number) {
    const producto = await this.prisma.producto.findUnique({
      where: { id },
      include: { movimientos: { orderBy: { fecha: 'desc' }, take: 20 } },
    });
    if (!producto) throw new NotFoundException(`No existe el producto ${id}`);
    return producto;
  }

  async actualizarProducto(id: number, data: Partial<ProductoInput>) {
    await this.exigirProducto(id);
    return this.prisma.producto.update({
      where: { id },
      data: {
        codigo: data.codigo,
        nombre: data.nombre,
        descripcion: data.descripcion,
        precioCosto: data.precioCosto,
        precioVenta: data.precioVenta,
        stockMinimo: data.stockMinimo,
      },
    });
  }

  listarMovimientos(productoId: number) {
    return this.prisma.movimientoStock.findMany({
      where: { productoId },
      orderBy: { fecha: 'desc' },
    });
  }

  async registrarMovimiento(data: MovimientoInput) {
    if (
      !Number.isFinite(data.cantidad) ||
      data.cantidad < 0 ||
      (data.tipo !== TipoMovimientoStock.AJUSTE && data.cantidad === 0)
    ) {
      throw new BadRequestException(
        data.tipo === TipoMovimientoStock.AJUSTE
          ? 'La cantidad del ajuste no puede ser negativa'
          : 'La cantidad debe ser mayor que cero',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const producto = await tx.producto.findUnique({
        where: { id: data.productoId },
      });
      if (!producto) {
        throw new NotFoundException(`No existe el producto ${data.productoId}`);
      }

      const actual = new Prisma.Decimal(producto.stockActual);
      const cantidad = new Prisma.Decimal(data.cantidad);
      let nuevoStock: Prisma.Decimal;
      let cantidadRegistrada = cantidad;

      switch (data.tipo) {
        case TipoMovimientoStock.INGRESO:
          nuevoStock = actual.plus(cantidad);
          break;
        case TipoMovimientoStock.EGRESO:
          if (actual.lessThan(cantidad)) {
            throw new BadRequestException('Stock insuficiente para registrar el egreso');
          }
          nuevoStock = actual.minus(cantidad);
          break;
        case TipoMovimientoStock.AJUSTE:
          nuevoStock = cantidad;
          cantidadRegistrada = cantidad.minus(actual);
          break;
        default:
          throw new BadRequestException('Tipo de movimiento inválido');
      }

      await tx.producto.update({
        where: { id: data.productoId },
        data: { stockActual: nuevoStock },
      });

      return tx.movimientoStock.create({
        data: {
          tipo: data.tipo,
          cantidad: cantidadRegistrada,
          motivo: data.motivo,
          referencia: data.referencia,
          productoId: data.productoId,
        },
      });
    });
  }

  private async exigirProducto(id: number) {
    const producto = await this.prisma.producto.findUnique({ where: { id } });
    if (!producto) throw new NotFoundException(`No existe el producto ${id}`);
    return producto;
  }
}
