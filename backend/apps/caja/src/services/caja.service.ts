import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../../../prisma/src/database/prisma.service';

@Injectable()
export class CajaService {
  constructor(
    private readonly prisma: PrismaService,
  ) { }

  // =========================
  // ABRIR CAJA
  // =========================

  async abrirCaja(montoInicial: number) {
    if (montoInicial < 0) {
      throw new ConflictException(
        'El monto inicial no puede ser negativo',
      );
    }

    const cajaAbierta = await this.prisma.caja.findFirst({
      where: {
        estado: 'ABIERTA',
      },
    });

    if (cajaAbierta) {
      throw new ConflictException(
        'Ya existe una caja abierta',
      );
    }

    const caja = await this.prisma.caja.create({
      data: {
        estado: 'ABIERTA',
        montoInicial,
        montoFinal: 0,
        fechaCierre: null,
        observacion: null,
      },
    });

    return caja;
  }

  // =========================
  // OBTENER CAJA ABIERTA
  // =========================

  async obtenerCajaAbierta() {
    const caja = await this.prisma.caja.findFirst({
      where: {
        estado: 'ABIERTA',
      },
    });

    if (!caja) {
      throw new NotFoundException(
        'No existe una caja abierta',
      );
    }

    return caja;
  }

  // =========================
  // OBTENER CAJA POR ID
  // =========================

  async obtenerPorId(id: number) {
    const caja = await this.prisma.caja.findUnique({
      where: {
        id,
      },
    });

    if (!caja) {
      throw new NotFoundException(
        `No existe la caja con ID ${id}`,
      );
    }

    return caja;
  }

  // =========================
  // REGISTRAR INGRESO
  // =========================

  async registrarIngreso(
    monto: number,
    descripcion?: string,
    referencia?: string,
  ) {
    if (monto <= 0) {
      throw new ConflictException(
        'El monto del ingreso debe ser mayor a 0',
      );
    }

    const caja = await this.obtenerCajaAbierta();

    const movimiento =
      await this.prisma.movimientoCaja.create({
        data: {
          tipo: 'INGRESO',
          monto,
          descripcion: descripcion ?? null,
          referencia: referencia ?? null,
          cajaId: caja.id,
        },
      });

    return movimiento;
  }

  // =========================
  // REGISTRAR RETIRO
  // =========================

  async registrarRetiro(
    monto: number,
    descripcion?: string,
    referencia?: string,
  ) {
    if (monto <= 0) {
      throw new ConflictException(
        'El monto del retiro debe ser mayor a 0',
      );
    }

    const caja = await this.obtenerCajaAbierta();

    const movimientos =
      await this.prisma.movimientoCaja.findMany({
        where: {
          cajaId: caja.id,
        },
      });

    let disponible = Number(caja.montoInicial);

    for (const movimiento of movimientos) {
      const montoMovimiento = Number(movimiento.monto);

      if (
        movimiento.tipo === 'INGRESO' ||
        movimiento.tipo === 'VENTA'
      ) {
        disponible += montoMovimiento;
      }

      if (
        movimiento.tipo === 'RETIRO' ||
        movimiento.tipo === 'GASTO'
      ) {
        disponible -= montoMovimiento;
      }
    }

    if (monto > disponible) {
      throw new ConflictException(
        `No hay suficiente dinero disponible en caja. Disponible: $${disponible.toFixed(2)}`,
      );
    }

    const movimiento =
      await this.prisma.movimientoCaja.create({
        data: {
          tipo: 'RETIRO',
          monto,
          descripcion: descripcion ?? null,
          referencia: referencia ?? null,
          cajaId: caja.id,
        },
      });

    return movimiento;
  }

  // =========================
  // LISTAR MOVIMIENTOS
  // =========================

  async obtenerMovimientos(cajaId: number) {
    const caja = await this.prisma.caja.findUnique({
      where: {
        id: cajaId,
      },
    });

    if (!caja) {
      throw new NotFoundException(
        `No existe la caja con ID ${cajaId}`,
      );
    }

    return this.prisma.movimientoCaja.findMany({
      where: {
        cajaId,
      },
      orderBy: {
        fecha: 'asc',
      },
    });
  }
  async cerrarCaja(observacion?: string) {
    const caja = await this.obtenerCajaAbierta();

    const movimientos =
      await this.prisma.movimientoCaja.findMany({
        where: {
          cajaId: caja.id,
        },
        orderBy: {
          fecha: 'asc',
        },
      });

    let montoFinal = Number(caja.montoInicial);

    for (const movimiento of movimientos) {
      const monto = Number(movimiento.monto);

      if (
        movimiento.tipo === 'INGRESO' ||
        movimiento.tipo === 'VENTA'
      ) {
        montoFinal += monto;
      }

      if (
        movimiento.tipo === 'RETIRO' ||
        movimiento.tipo === 'GASTO'
      ) {
        montoFinal -= monto;
      }
    }

    const cajaCerrada =
      await this.prisma.caja.update({
        where: {
          id: caja.id,
        },
        data: {
          estado: 'CERRADA',
          montoFinal,
          fechaCierre: new Date(),
          observacion: observacion ?? null,
        },
      });

    return cajaCerrada;
  }
}