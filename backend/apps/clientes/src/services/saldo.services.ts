import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  MovimientoSaldo,
  TipoMovimientoSaldo,
  EstadoMovimientoSaldo,
} from '../entities/movimiento-saldo.entity';

@Injectable()
export class SaldoService {
  constructor(
    @InjectRepository(MovimientoSaldo)
    private readonly movimientoSaldoRepository: Repository<MovimientoSaldo>,
  ) {}

  /**
   * Genera saldo a favor a partir de una NTDC.
   *
   * El saldo tiene una vigencia de 30 días.
   */
  async generarSaldoPorNtdc(
    clienteId: number,
    monto: number,
    referencia: string,
    observacion?: string,
  ) {
    if (monto <= 0) {
      throw new Error('El monto de la NTDC debe ser mayor a 0');
    }

    const fecha = new Date();

    const fechaVencimiento = new Date(fecha);
    fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);

    const movimiento = this.movimientoSaldoRepository.create({
      tipo: TipoMovimientoSaldo.NTDC,
      monto,
      montoDisponible: monto,
      fecha,
      fechaVencimiento,
      estado: EstadoMovimientoSaldo.ACTIVO,
      referencia,
      observacion: observacion ?? null,
      cliente: {
        id: clienteId,
      },
    });

    return this.movimientoSaldoRepository.save(movimiento);
  }

  /**
   * Obtiene el saldo disponible de un cliente.
   */
  async obtenerSaldo(clienteId: number) {
    await this.actualizarVencimientos(clienteId);

    const movimientos = await this.movimientoSaldoRepository.find({
      where: {
        cliente: {
          id: clienteId,
        },
        tipo: TipoMovimientoSaldo.NTDC,
        estado: EstadoMovimientoSaldo.ACTIVO,
      },
      order: {
        fechaVencimiento: 'ASC',
      },
    });

    const saldoDisponible = movimientos.reduce(
      (total, movimiento) =>
        total + Number(movimiento.montoDisponible),
      0,
    );

    return {
      clienteId,
      saldoDisponible,
      movimientos,
    };
  }

  /**
   * Consume saldo a favor.
   *
   * Se utiliza primero el saldo que vence más próximo.
   */
  async consumirSaldo(
    clienteId: number,
    monto: number,
    referencia: string,
    observacion?: string,
  ) {
    if (monto <= 0) {
      throw new Error('El monto a consumir debe ser mayor a 0');
    }

    await this.actualizarVencimientos(clienteId);

    const movimientos = await this.movimientoSaldoRepository.find({
      where: {
        cliente: {
          id: clienteId,
        },
        tipo: TipoMovimientoSaldo.NTDC,
        estado: EstadoMovimientoSaldo.ACTIVO,
      },
      order: {
        fechaVencimiento: 'ASC',
      },
    });

    let restante = monto;
    const consumos: MovimientoSaldo[] = [];

    for (const movimiento of movimientos) {
      if (restante <= 0) {
        break;
      }

      const disponible = Number(movimiento.montoDisponible);

      if (disponible <= 0) {
        continue;
      }

      const consumir = Math.min(disponible, restante);

      movimiento.montoDisponible = disponible - consumir;

      if (movimiento.montoDisponible === 0) {
        movimiento.estado = EstadoMovimientoSaldo.CONSUMIDO;
      }

      await this.movimientoSaldoRepository.save(movimiento);

      const consumo = this.movimientoSaldoRepository.create({
        tipo: TipoMovimientoSaldo.CONSUMO,
        monto: consumir,
        montoDisponible: 0,
        fecha: new Date(),
        fechaVencimiento: null,
        estado: EstadoMovimientoSaldo.CONSUMIDO,
        referencia,
        observacion:
          observacion ??
          `Consumo de saldo generado por ${movimiento.referencia}`,
        cliente: {
          id: clienteId,
        },
      });

      const consumoGuardado =
        await this.movimientoSaldoRepository.save(consumo);

      consumos.push(consumoGuardado);

      restante -= consumir;
    }

    if (restante > 0) {
      throw new Error(
        `Saldo insuficiente. Faltan $${restante.toFixed(2)}`,
      );
    }

    const saldoActual = await this.obtenerSaldo(clienteId);

    return {
      clienteId,
      montoConsumido: monto,
      saldoDisponible: saldoActual.saldoDisponible,
      consumos,
    };
  }

  /**
   * Marca como vencidos los saldos cuya fecha de vencimiento
   * ya pasó.
   */
  async actualizarVencimientos(clienteId: number) {
    const ahora = new Date();

    const movimientos = await this.movimientoSaldoRepository.find({
      where: {
        cliente: {
          id: clienteId,
        },
        tipo: TipoMovimientoSaldo.NTDC,
        estado: EstadoMovimientoSaldo.ACTIVO,
      },
    });

    const vencidos: MovimientoSaldo[] = [];

    for (const movimiento of movimientos) {
      if (
        movimiento.fechaVencimiento &&
        movimiento.fechaVencimiento <= ahora
      ) {
        movimiento.estado = EstadoMovimientoSaldo.VENCIDO;

        const actualizado =
          await this.movimientoSaldoRepository.save(movimiento);

        vencidos.push(actualizado);
      }
    }

    return {
      clienteId,
      movimientosVencidos: vencidos.length,
    };
  }
}