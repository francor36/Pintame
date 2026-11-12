import {
  BadRequestException,
  ConflictException,
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

  async crearProducto(data: ProductoInput) {
    const values = this.validarProducto(data, false);
    try {
      return await this.prisma.producto.create({
        data: {
          codigo: values.codigo!,
          nombre: values.nombre!,
          descripcion: values.descripcion,
          precioCosto: values.precioCosto!,
          precioVenta: values.precioVenta!,
          stockMinimo: values.stockMinimo ?? 0,
        },
      });
    } catch (error) {
      this.mapUniqueCode(error);
      throw error;
    }
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
    const values = this.validarProducto(data, true);
    try {
      return await this.prisma.producto.update({
        where: { id },
        data: {
          codigo: values.codigo,
          nombre: values.nombre,
          descripcion: values.descripcion,
          precioCosto: values.precioCosto,
          precioVenta: values.precioVenta,
          stockMinimo: values.stockMinimo,
        },
      });
    } catch (error) {
      this.mapUniqueCode(error);
      throw error;
    }
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
      data.cantidad > 999999999.999 ||
      Math.abs(data.cantidad * 1000 - Math.round(data.cantidad * 1000)) > 1e-7 ||
      (data.tipo !== TipoMovimientoStock.AJUSTE && data.cantidad === 0)
    ) {
      throw new BadRequestException(
        'La cantidad debe ser no negativa, admitir hasta tres decimales y estar dentro del rango permitido',
      );
    }
    if (data.motivo && data.motivo.length > 255) {
      throw new BadRequestException('El motivo admite hasta 255 caracteres');
    }
    if (data.referencia && data.referencia.length > 100) {
      throw new BadRequestException('La referencia admite hasta 100 caracteres');
    }

    return this.prisma.$transaction(async (tx) => {
      // Serializa los movimientos del producto y permite que las referencias
      // de ventas sean idempotentes ante reintentos TCP con respuesta perdida.
      await tx.$queryRaw<Array<{ id: number }>>`
        SELECT id FROM productos WHERE id = ${data.productoId} FOR UPDATE
      `;

      if (data.referencia?.trim()) {
        const previo = await tx.movimientoStock.findFirst({
          where: { productoId: data.productoId, referencia: data.referencia.trim() },
        });
        if (previo) {
          const coincide =
            previo.tipo === data.tipo &&
            data.tipo !== TipoMovimientoStock.AJUSTE &&
            new Prisma.Decimal(previo.cantidad).equals(new Prisma.Decimal(data.cantidad));
          if (!coincide) {
            throw new ConflictException(
              'La referencia del movimiento ya existe con otros datos',
            );
          }
          return previo;
        }
      }

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
      if (nuevoStock.greaterThan('999999999.999')) {
        throw new BadRequestException('El stock resultante supera el máximo permitido');
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

  private validarProducto(data: Partial<ProductoInput>, parcial: boolean) {
    if (!data || typeof data !== 'object') {
      throw new BadRequestException('Los datos del producto son obligatorios');
    }
    if (!parcial && (!data.codigo || !data.nombre || data.precioCosto === undefined || data.precioVenta === undefined)) {
      throw new BadRequestException('Código, nombre, precio de costo y precio de venta son obligatorios');
    }
    if (parcial && !Object.values(data).some((value) => value !== undefined)) {
      throw new BadRequestException('Indicá al menos un dato para actualizar');
    }
    const codigo = data.codigo?.trim();
    const nombre = data.nombre?.trim();
    if (data.codigo !== undefined && (!codigo || codigo.length > 50)) {
      throw new BadRequestException('El código es obligatorio y admite hasta 50 caracteres');
    }
    if (data.nombre !== undefined && (!nombre || nombre.length > 150)) {
      throw new BadRequestException('El nombre es obligatorio y admite hasta 150 caracteres');
    }
    if (data.descripcion !== undefined && data.descripcion !== null &&
      (typeof data.descripcion !== 'string' || data.descripcion.length > 500)) {
      throw new BadRequestException('La descripción admite hasta 500 caracteres');
    }
    this.validarDecimal(data.precioCosto, 'El precio de costo', 2, 9999999999.99);
    this.validarDecimal(data.precioVenta, 'El precio de venta', 2, 9999999999.99);
    this.validarDecimal(data.stockMinimo, 'El stock mínimo', 3, 999999999.999);
    return {
      ...data,
      codigo,
      nombre,
      descripcion: data.descripcion === null ? null : data.descripcion,
    };
  }

  private validarDecimal(value: number | undefined, label: string, scale: number, max: number) {
    if (value === undefined) return;
    const factor = 10 ** scale;
    if (
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      value < 0 ||
      value > max ||
      Math.abs(value * factor - Math.round(value * factor)) > 1e-7
    ) {
      throw new BadRequestException(`${label} debe ser no negativo, admitir hasta ${scale} decimales y estar dentro del rango permitido`);
    }
  }

  private mapUniqueCode(error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Ya existe un producto con ese código');
    }
  }
}
