import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { EstadoVenta, Prisma } from '@prisma/client-ventas';
import { firstValueFrom, timeout } from 'rxjs';
import { PrismaVentasService } from '../database/prisma-ventas.service';
import { rpcErrorToHttpException } from '../rpc-http-exception.filter';

export type CrearVentaInput = {
  detalles: Array<{ productoId: number; cantidad: number }>;
  observacion?: string;
  usuarioId?: number;
  usuarioNombre?: string;
  ubicacionLatitud?: number;
  ubicacionLongitud?: number;
};

type ProductoStock = {
  id: number;
  nombre: string;
  precioVenta: Prisma.Decimal | number | string;
  stockActual: Prisma.Decimal | number | string;
  estado: string;
};

@Injectable()
export class VentasService {
  constructor(
    private readonly prisma: PrismaVentasService,
    @Inject('STOCK_SERVICE') private readonly stockClient: ClientProxy,
    @Inject('CAJA_SERVICE') private readonly cajaClient: ClientProxy,
  ) {}

  getHello(): string {
    return 'Ventas listo';
  }

  listarVentas(usuarioId?: number) {
    return this.prisma.venta.findMany({
      where: usuarioId === undefined ? undefined : { usuarioId },
      include: { detalles: true },
      orderBy: { fecha: 'desc' },
    });
  }

  async buscarVenta(id: number, usuarioId?: number) {
    const venta = await this.prisma.venta.findUnique({
      where: { id },
      include: { detalles: true },
    });
    if (!venta) throw new NotFoundException(`No existe la venta ${id}`);
    if (usuarioId !== undefined && venta.usuarioId !== usuarioId) {
      throw new NotFoundException(`No existe la venta ${id}`);
    }
    return venta;
  }

  async crearVenta(input: CrearVentaInput) {
    if (!Array.isArray(input.detalles) || input.detalles.length === 0) {
      throw new BadRequestException('La venta debe incluir al menos un producto');
    }
    if (input.detalles.length > 100) {
      throw new BadRequestException('Una venta puede incluir hasta 100 productos diferentes');
    }
    const tieneLatitud = input.ubicacionLatitud !== undefined;
    const tieneLongitud = input.ubicacionLongitud !== undefined;
    if (tieneLatitud !== tieneLongitud || (tieneLatitud && (
      !Number.isFinite(input.ubicacionLatitud) || input.ubicacionLatitud! < -90 || input.ubicacionLatitud! > 90 ||
      !Number.isFinite(input.ubicacionLongitud) || input.ubicacionLongitud! < -180 || input.ubicacionLongitud! > 180
    ))) {
      throw new BadRequestException('La ubicación debe incluir latitud y longitud válidas');
    }

    const cantidadesPorProducto = new Map<number, number>();
    for (const item of input.detalles) {
      if (!Number.isInteger(item.productoId) || item.productoId <= 0) {
        throw new BadRequestException('Cada producto debe tener un ID válido');
      }
      if (!Number.isFinite(item.cantidad) || item.cantidad <= 0) {
        throw new BadRequestException('La cantidad de cada producto debe ser mayor que cero');
      }
      const total = (cantidadesPorProducto.get(item.productoId) ?? 0) + item.cantidad;
      if (!Number.isFinite(total) || total > 999999999.999) {
        throw new BadRequestException('La cantidad total del producto supera el límite permitido');
      }
      cantidadesPorProducto.set(item.productoId, total);
    }

    const stockProducts = new Map<number, ProductoStock>();
    const lines: Array<{
      productoId: string;
      descripcion: string;
      cantidad: Prisma.Decimal;
      precioUnitario: Prisma.Decimal;
      subtotal: Prisma.Decimal;
    }> = [];

    for (const [productoId, cantidadInput] of cantidadesPorProducto) {
      let product = stockProducts.get(productoId);
      if (!product) {
        let fetchedProduct: ProductoStock;
        try {
          fetchedProduct = await firstValueFrom(
            this.stockClient
              .send<ProductoStock>({ cmd: 'stock.productos.buscar' }, { id: productoId })
              .pipe(timeout(10000)),
          );
        } catch (error) {
          throw (
            rpcErrorToHttpException(error) ??
            new ServiceUnavailableException('El servicio de stock no está disponible')
          );
        }
        stockProducts.set(productoId, fetchedProduct);
        product = fetchedProduct;
      }
      if (product.estado !== 'ACTIVO') {
        throw new ConflictException(`El producto ${productoId} está inactivo`);
      }

      const cantidad = new Prisma.Decimal(cantidadInput);
      if (cantidad.greaterThan(new Prisma.Decimal(product.stockActual))) {
        throw new BadRequestException(`Stock insuficiente para ${product.nombre}. Disponible: ${product.stockActual}`);
      }
      const precioUnitario = new Prisma.Decimal(product.precioVenta);
      const subtotal = cantidad.mul(precioUnitario).toDecimalPlaces(2);
      lines.push({
        productoId: String(productoId),
        descripcion: product.nombre,
        cantidad,
        precioUnitario,
        subtotal,
      });
    }

    const total = lines.reduce(
      (sum, line) => sum.plus(line.subtotal),
      new Prisma.Decimal(0),
    );
    const numero = `VTA-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    return this.prisma.venta.create({
      data: {
        numero,
        estado: EstadoVenta.PENDIENTE,
        subtotal: total,
        total,
        observacion: input.observacion,
        usuarioId: input.usuarioId,
        usuarioNombre: input.usuarioNombre,
        ubicacionLatitud: input.ubicacionLatitud,
        ubicacionLongitud: input.ubicacionLongitud,
        detalles: { create: lines },
      },
      include: { detalles: true },
    });
  }

  async confirmarVenta(id: number, usuarioId?: number) {
    const venta = await this.buscarVenta(id, usuarioId);
    if (venta.estado !== EstadoVenta.PENDIENTE) {
      throw new ConflictException('Solo se pueden confirmar ventas pendientes');
    }

    const token = randomUUID();
    const claim = await this.prisma.venta.updateMany({
      where: { id, estado: EstadoVenta.PENDIENTE },
      data: {
        estado: EstadoVenta.PROCESANDO,
        confirmacionToken: token,
        confirmacionLeaseHasta: new Date(Date.now() + 120_000),
      },
    });
    if (claim.count !== 1) {
      throw new ConflictException('La venta ya está siendo procesada o ya fue confirmada');
    }

    return this.ejecutarConfirmacion(venta, token);
  }

  async reintentarConfirmacion(id: number) {
    const venta = await this.buscarVenta(id);
    if (venta.estado !== EstadoVenta.PROCESANDO) {
      throw new ConflictException('Solo se pueden recuperar ventas en proceso');
    }
    const token = randomUUID();
    const ahora = new Date();
    const claim = await this.prisma.venta.updateMany({
      where: {
        id,
        estado: EstadoVenta.PROCESANDO,
        OR: [
          { confirmacionLeaseHasta: null },
          { confirmacionLeaseHasta: { lt: ahora } },
        ],
      },
      data: {
        confirmacionToken: token,
        confirmacionLeaseHasta: new Date(Date.now() + 120_000),
      },
    });
    if (claim.count !== 1) {
      throw new ConflictException('La confirmación sigue activa; esperá un momento y actualizá la venta');
    }
    return this.ejecutarConfirmacion(venta, token);
  }

  private async ejecutarConfirmacion(venta: Awaited<ReturnType<VentasService['buscarVenta']>>, token: string) {
    const id = venta.id;
    const stockMovements: Array<{ productoId: number; cantidad: number; referencia: string }> = [];
    let cashCallStarted = false;
    try {
      for (const detail of venta.detalles) {
        await this.renovarLease(id, token);
        const productoId = Number(detail.productoId);
        const cantidad = Number(detail.cantidad);
        const referencia = `${venta.numero}-D${detail.id}`;
        await firstValueFrom(
          this.stockClient
            .send(
              { cmd: 'stock.movimientos.crear' },
              { productoId, tipo: 'EGRESO', cantidad, motivo: `Venta ${venta.numero}`, referencia },
            )
            .pipe(timeout(10000)),
        );
        stockMovements.push({ productoId, cantidad, referencia });
      }

      await this.renovarLease(id, token);
      cashCallStarted = true;
      await firstValueFrom(
        this.cajaClient
          .send(
            { cmd: 'caja.venta' },
            { monto: Number(venta.total), descripcion: `Venta ${venta.numero}`, referencia: venta.numero },
          )
          .pipe(timeout(10000)),
      );

      const paid = await this.prisma.venta.updateMany({
        where: { id, estado: EstadoVenta.PROCESANDO, confirmacionToken: token },
        data: {
          estado: EstadoVenta.PAGADA,
          confirmacionToken: null,
          confirmacionLeaseHasta: null,
        },
      });
      if (paid.count !== 1) throw new ConflictException('La confirmación perdió su bloqueo; la venta requiere recuperación');
      return this.buscarVenta(id);
    } catch (error) {
      const current = await this.prisma.venta.findUnique({
        where: { id },
        select: { confirmacionToken: true, estado: true },
      });
      if (current?.confirmacionToken !== token) {
        throw new ConflictException('La confirmación fue tomada por otro intento; actualizá la venta');
      }

      const downstreamError = rpcErrorToHttpException(error);
      const uncertain = !downstreamError || downstreamError.getStatus() >= 500 ||
        (cashCallStarted && downstreamError.getStatus() === 409);
      if (uncertain) {
        await this.prisma.venta.updateMany({
          where: { id, estado: EstadoVenta.PROCESANDO, confirmacionToken: token },
          data: { confirmacionToken: null, confirmacionLeaseHasta: new Date(0) },
        });
        throw downstreamError ?? new ServiceUnavailableException('La confirmación quedó en proceso y un ADMIN puede reintentarla');
      }

      const compensations = await Promise.allSettled(
        stockMovements.map(({ productoId, cantidad, referencia }) =>
          firstValueFrom(
            this.stockClient
              .send(
                { cmd: 'stock.movimientos.crear' },
                { productoId, tipo: 'INGRESO', cantidad, motivo: `Reversión de venta ${venta.numero}`, referencia: `REV-${referencia}` },
              )
              .pipe(timeout(10000)),
          ),
        ),
      );
      const compensationFailed = compensations.some((result) => result.status === 'rejected');
      if (!compensationFailed) {
        await this.prisma.venta.updateMany({
          where: { id, estado: EstadoVenta.PROCESANDO, confirmacionToken: token },
          data: {
            estado: EstadoVenta.PENDIENTE,
            confirmacionToken: null,
            confirmacionLeaseHasta: null,
          },
        });
      } else {
        await this.prisma.venta.updateMany({
          where: { id, estado: EstadoVenta.PROCESANDO, confirmacionToken: token },
          data: { confirmacionToken: null, confirmacionLeaseHasta: new Date(0) },
        });
      }

      if (compensationFailed) {
        throw new ConflictException('No se pudo revertir el stock; la venta quedó en proceso para recuperación por ADMIN');
      }
      if (downstreamError) throw downstreamError;
      throw new ConflictException('No se pudo confirmar la venta; puede intentarse nuevamente');
    }
  }

  private async renovarLease(id: number, token: string) {
    const updated = await this.prisma.venta.updateMany({
      where: { id, estado: EstadoVenta.PROCESANDO, confirmacionToken: token },
      data: { confirmacionLeaseHasta: new Date(Date.now() + 120_000) },
    });
    if (updated.count !== 1) throw new ConflictException('La confirmación ya no tiene el bloqueo de la venta');
  }

  async anularVenta(id: number, usuarioId?: number) {
    await this.buscarVenta(id, usuarioId);
    const result = await this.prisma.venta.updateMany({
      where: { id, estado: EstadoVenta.PENDIENTE },
      data: { estado: EstadoVenta.ANULADA },
    });
    if (result.count !== 1) {
      const venta = await this.buscarVenta(id);
      throw new ConflictException(
        `No se puede anular una venta en estado ${venta.estado}`,
      );
    }
    return this.buscarVenta(id);
  }
}
