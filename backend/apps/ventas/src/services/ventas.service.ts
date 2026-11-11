import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import { EstadoVenta, Prisma } from '@prisma/client-ventas';
import { firstValueFrom, timeout } from 'rxjs';
import { PrismaVentasService } from '../../database/prisma-ventas.service';

export type CrearVentaInput = {
  detalles: Array<{ productoId: number; cantidad: number }>;
  observacion?: string;
};

type ProductoStock = {
  id: number;
  nombre: string;
  precioVenta: Prisma.Decimal | number | string;
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

  listarVentas() {
    return this.prisma.venta.findMany({
      include: { detalles: true },
      orderBy: { fecha: 'desc' },
    });
  }

  async buscarVenta(id: number) {
    const venta = await this.prisma.venta.findUnique({
      where: { id },
      include: { detalles: true },
    });
    if (!venta) throw new NotFoundException(`No existe la venta ${id}`);
    return venta;
  }

  async crearVenta(input: CrearVentaInput) {
    if (!Array.isArray(input.detalles) || input.detalles.length === 0) {
      throw new BadRequestException('La venta debe incluir al menos un producto');
    }

    const stockProducts = new Map<number, ProductoStock>();
    const lines: Array<{
      productoId: string;
      descripcion: string;
      cantidad: Prisma.Decimal;
      precioUnitario: Prisma.Decimal;
      subtotal: Prisma.Decimal;
    }> = [];

    for (const item of input.detalles) {
      if (!Number.isInteger(item.productoId) || item.productoId <= 0) {
        throw new BadRequestException('Cada producto debe tener un ID válido');
      }
      if (!Number.isFinite(item.cantidad) || item.cantidad <= 0) {
        throw new BadRequestException('La cantidad de cada producto debe ser mayor que cero');
      }

      let product = stockProducts.get(item.productoId);
      if (!product) {
        const fetchedProduct = await firstValueFrom(
          this.stockClient
            .send<ProductoStock>({ cmd: 'stock.productos.buscar' }, { id: item.productoId })
            .pipe(timeout(10000)),
        );
        stockProducts.set(item.productoId, fetchedProduct);
        product = fetchedProduct;
      }
      if (product.estado !== 'ACTIVO') {
        throw new ConflictException(`El producto ${item.productoId} está inactivo`);
      }

      const cantidad = new Prisma.Decimal(item.cantidad);
      const precioUnitario = new Prisma.Decimal(product.precioVenta);
      const subtotal = cantidad.mul(precioUnitario).toDecimalPlaces(2);
      lines.push({
        productoId: String(item.productoId),
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
        detalles: { create: lines },
      },
      include: { detalles: true },
    });
  }

  async confirmarVenta(id: number) {
    const venta = await this.buscarVenta(id);
    if (venta.estado !== EstadoVenta.PENDIENTE) {
      throw new ConflictException('Solo se pueden confirmar ventas pendientes');
    }

    // Claim the pending sale atomically so two requests cannot charge it twice.
    const claim = await this.prisma.venta.updateMany({
      where: { id, estado: EstadoVenta.PENDIENTE },
      data: { estado: EstadoVenta.PAGADA },
    });
    if (claim.count !== 1) {
      throw new ConflictException('La venta ya está siendo procesada o ya fue confirmada');
    }

    const stockMovements: Array<{ productoId: number; cantidad: number; referencia: string }> = [];
    try {
      for (const detail of venta.detalles) {
        const productoId = Number(detail.productoId);
        const cantidad = Number(detail.cantidad);
        const referencia = `${venta.numero}-D${detail.id}`;
        await firstValueFrom(
          this.stockClient
            .send(
              { cmd: 'stock.movimientos.crear' },
              {
                productoId,
                tipo: 'EGRESO',
                cantidad,
                motivo: `Venta ${venta.numero}`,
                referencia,
              },
            )
            .pipe(timeout(10000)),
        );
        stockMovements.push({ productoId, cantidad, referencia });
      }

      await firstValueFrom(
        this.cajaClient
          .send(
            { cmd: 'caja.venta' },
            {
              monto: Number(venta.total),
              descripcion: `Venta ${venta.numero}`,
              referencia: venta.numero,
            },
          )
          .pipe(timeout(10000)),
      );

      return this.buscarVenta(id);
    } catch (error) {
      const compensations = await Promise.allSettled(
        stockMovements.map(({ productoId, cantidad, referencia }) =>
          firstValueFrom(
            this.stockClient
              .send(
                { cmd: 'stock.movimientos.crear' },
                {
                  productoId,
                  tipo: 'INGRESO',
                  cantidad,
                  motivo: `Reversión de venta ${venta.numero}`,
                  referencia: `REV-${referencia}`,
                },
              )
              .pipe(timeout(10000)),
          ),
        ),
      );
      const compensationFailed = compensations.some((result) => result.status === 'rejected');
      if (!compensationFailed) {
        await this.prisma.venta.updateMany({
          where: { id, estado: EstadoVenta.PAGADA },
          data: { estado: EstadoVenta.PENDIENTE },
        });
      }

      if (compensationFailed) {
        throw new ConflictException(
          'No se pudo completar o revertir el stock de la venta; requiere revisión manual',
        );
      }
      throw new ConflictException(
        'No se pudo confirmar la venta; revise que Stock y Caja estén disponibles y vuelva a intentar',
      );
    }
  }

  async anularVenta(id: number) {
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
