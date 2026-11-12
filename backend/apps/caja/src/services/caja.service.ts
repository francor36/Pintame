import {
  BadRequestException,
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
    this.validarMonto(montoInicial, true);

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
    this.validarMonto(monto);
    this.validarTextoMovimiento(descripcion, referencia);

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

  async registrarVenta(
    monto: number,
    descripcion?: string,
    referencia?: string,
  ) {
    this.validarMonto(monto);
    this.validarTextoMovimiento(descripcion, referencia);

    if (referencia) {
      const existente = await this.prisma.movimientoCaja.findFirst({
        where: { tipo: 'VENTA', referencia },
      });
      if (existente) {
        if (Number(existente.monto) !== monto) {
          throw new ConflictException('La referencia ya existe con otro monto');
        }
        return existente;
      }
    }

    const caja = await this.obtenerCajaAbierta();
    return this.prisma.movimientoCaja.create({
      data: {
        tipo: 'VENTA',
        monto,
        descripcion: descripcion ?? null,
        referencia: referencia ?? null,
        cajaId: caja.id,
      },
    });
  }

  // =========================
  // REGISTRAR RETIRO
  // =========================

  async registrarRetiro(
    monto: number,
    descripcion?: string,
    referencia?: string,
  ) {
    this.validarMonto(monto);
    this.validarTextoMovimiento(descripcion, referencia);

    const caja = await this.obtenerCajaAbierta();

    const movimientos =
      await this.prisma.movimientoCaja.findMany({
        where: {
          cajaId: caja.id,
        },
      });

    let disponibleCentavos = Math.round(Number(caja.montoInicial) * 100);

    for (const movimiento of movimientos) {
      const montoMovimientoCentavos = Math.round(Number(movimiento.monto) * 100);

      if (
        movimiento.tipo === 'INGRESO' ||
        movimiento.tipo === 'VENTA'
      ) {
        disponibleCentavos += montoMovimientoCentavos;
      }

      if (
        movimiento.tipo === 'RETIRO' ||
        movimiento.tipo === 'GASTO'
      ) {
        disponibleCentavos -= montoMovimientoCentavos;
      }
    }

    const montoCentavos = Math.round(monto * 100);
    if (montoCentavos > disponibleCentavos) {
      throw new ConflictException(
        `No hay suficiente dinero disponible en caja. Disponible: $${(disponibleCentavos / 100).toFixed(2)}`,
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
    if (observacion !== undefined && (typeof observacion !== 'string' || observacion.length > 500)) {
      throw new BadRequestException('La observación admite hasta 500 caracteres');
    }
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

    let montoFinalCentavos = Math.round(Number(caja.montoInicial) * 100);

    for (const movimiento of movimientos) {
      const montoCentavos = Math.round(Number(movimiento.monto) * 100);

      if (
        movimiento.tipo === 'INGRESO' ||
        movimiento.tipo === 'VENTA'
      ) {
        montoFinalCentavos += montoCentavos;
      }

      if (
        movimiento.tipo === 'RETIRO' ||
        movimiento.tipo === 'GASTO'
      ) {
        montoFinalCentavos -= montoCentavos;
      }
    }

    const cajaCerrada =
      await this.prisma.caja.update({
        where: {
          id: caja.id,
        },
        data: {
          estado: 'CERRADA',
          montoFinal: montoFinalCentavos / 100,
          fechaCierre: new Date(),
          observacion: observacion ?? null,
        },
      });

    return cajaCerrada;
  }

  private validarMonto(monto: number, permiteCero = false) {
    const maximo = 9999999999.99;
    const centavos = Math.round(monto * 100);
    if (
      !Number.isFinite(monto) ||
      monto < 0 ||
      (!permiteCero && monto === 0) ||
      monto > maximo ||
      Math.abs(monto * 100 - centavos) > 1e-7
    ) {
      throw new BadRequestException(
        `El monto debe ser ${permiteCero ? 'no negativo' : 'mayor a cero'}, admitir hasta dos decimales y no superar $${maximo}`,
      );
    }
  }

  private validarTextoMovimiento(descripcion?: string, referencia?: string) {
    if (descripcion !== undefined && (typeof descripcion !== 'string' || descripcion.length > 500)) {
      throw new BadRequestException('La descripción admite hasta 500 caracteres');
    }
    if (referencia !== undefined && (typeof referencia !== 'string' || referencia.length > 100)) {
      throw new BadRequestException('La referencia admite hasta 100 caracteres');
    }
  }
}
