import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import {
  MovimientoSaldo,
  TipoMovimientoSaldo,
  EstadoMovimientoSaldo,
} from '../entities/movimiento-saldo.entity';
import { Cliente } from '../entities/cliente.entity';

@Injectable()
export class SaldoService {
  constructor(private readonly dataSource: DataSource) {}

  /** Carga NTDC como saldo a favor, con vigencia de 30 días. */
  async generarSaldoPorNtdc(
    clienteId: number,
    monto: number,
    referencia: string,
    observacion?: string,
  ) {
    this.validarMonto(monto);
    const ref = this.validarReferencia(referencia);

    return this.dataSource.transaction(async (manager) => {
      await this.obtenerCliente(manager, clienteId, true);
      const repo = manager.getRepository(MovimientoSaldo);
      const duplicado = await repo.findOne({
        where: { cliente: { id: clienteId }, tipo: TipoMovimientoSaldo.NTDC, referencia: ref },
      });
      if (duplicado) {
        throw new ConflictException(`Ya existe un saldo con la referencia ${ref}`);
      }

      const fecha = new Date();
      const fechaVencimiento = new Date(fecha);
      fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);
      const movimiento = repo.create({
        tipo: TipoMovimientoSaldo.NTDC,
        monto,
        montoDisponible: monto,
        fecha,
        fechaVencimiento,
        estado: EstadoMovimientoSaldo.ACTIVO,
        referencia: ref,
        observacion: observacion ?? null,
        cliente: { id: clienteId },
      });
      return repo.save(movimiento);
    });
  }

  async obtenerSaldo(clienteId: number) {
    await this.obtenerCliente(this.dataSource.manager, clienteId);
    await this.actualizarVencimientos(clienteId);
    const movimientos = await this.dataSource.getRepository(MovimientoSaldo).find({
      where: {
        cliente: { id: clienteId },
        tipo: TipoMovimientoSaldo.NTDC,
        estado: EstadoMovimientoSaldo.ACTIVO,
      },
      order: { fechaVencimiento: 'ASC' },
    });
    const saldoDisponible = movimientos.reduce(
      (total, movimiento) => total + Number(movimiento.montoDisponible),
      0,
    );
    return { clienteId, saldoDisponible, movimientos };
  }

  /** Consume saldo FIFO en una transacción: un fallo revierte todos los cambios. */
  async consumirSaldo(
    clienteId: number,
    monto: number,
    referencia: string,
    observacion?: string,
  ) {
    this.validarMonto(monto);
    const ref = this.validarReferencia(referencia);

    return this.dataSource.transaction(async (manager) => {
      await this.obtenerCliente(manager, clienteId, true);
      const repo = manager.getRepository(MovimientoSaldo);
      const duplicado = await repo.findOne({
        where: { cliente: { id: clienteId }, tipo: TipoMovimientoSaldo.CONSUMO, referencia: ref },
      });
      if (duplicado) {
        throw new ConflictException(`Ya existe un consumo con la referencia ${ref}`);
      }

      const ahora = new Date();
      const activos = await repo.find({
        where: {
          cliente: { id: clienteId },
          tipo: TipoMovimientoSaldo.NTDC,
          estado: EstadoMovimientoSaldo.ACTIVO,
        },
        order: { fechaVencimiento: 'ASC' },
        lock: { mode: 'pessimistic_write' },
      });

      const vigentes: MovimientoSaldo[] = [];
      for (const movimiento of activos) {
        if (movimiento.fechaVencimiento && movimiento.fechaVencimiento <= ahora) {
          movimiento.estado = EstadoMovimientoSaldo.VENCIDO;
          await repo.save(movimiento);
        } else {
          vigentes.push(movimiento);
        }
      }

      const saldoDisponible = vigentes.reduce(
        (total, movimiento) => total + Number(movimiento.montoDisponible),
        0,
      );
      if (saldoDisponible < monto) {
        throw new BadRequestException(
          `Saldo insuficiente. Disponible: $${saldoDisponible.toFixed(2)}`,
        );
      }

      let restante = monto;
      const consumos: MovimientoSaldo[] = [];
      for (const movimiento of vigentes) {
        if (restante <= 0) break;
        const disponible = Number(movimiento.montoDisponible);
        if (disponible <= 0) continue;
        const consumir = Math.min(disponible, restante);
        const nuevoDisponible = Number((disponible - consumir).toFixed(2));
        movimiento.montoDisponible = nuevoDisponible;
        if (nuevoDisponible === 0) movimiento.estado = EstadoMovimientoSaldo.CONSUMIDO;
        await repo.save(movimiento);

        const consumo = repo.create({
          tipo: TipoMovimientoSaldo.CONSUMO,
          monto: consumir,
          montoDisponible: 0,
          fecha: new Date(),
          fechaVencimiento: null,
          estado: EstadoMovimientoSaldo.CONSUMIDO,
          referencia: ref,
          observacion: observacion ?? `Consumo de saldo generado por ${movimiento.referencia}`,
          cliente: { id: clienteId },
        });
        consumos.push(await repo.save(consumo));
        restante = Number((restante - consumir).toFixed(2));
      }

      return {
        clienteId,
        montoConsumido: monto,
        saldoDisponible: Number((saldoDisponible - monto).toFixed(2)),
        consumos,
      };
    });
  }

  async actualizarVencimientos(clienteId: number) {
    return this.dataSource.transaction(async (manager) => {
      await this.obtenerCliente(manager, clienteId, true);
      const repo = manager.getRepository(MovimientoSaldo);
      const activos = await repo.find({
        where: {
          cliente: { id: clienteId },
          tipo: TipoMovimientoSaldo.NTDC,
          estado: EstadoMovimientoSaldo.ACTIVO,
        },
        lock: { mode: 'pessimistic_write' },
      });
      const ahora = new Date();
      const vencidos: MovimientoSaldo[] = [];
      for (const movimiento of activos) {
        if (movimiento.fechaVencimiento && movimiento.fechaVencimiento <= ahora) {
          movimiento.estado = EstadoMovimientoSaldo.VENCIDO;
          vencidos.push(await repo.save(movimiento));
        }
      }
      return { clienteId, movimientosVencidos: vencidos.length };
    });
  }

  private validarMonto(monto: number) {
    if (!Number.isFinite(monto) || monto <= 0) {
      throw new BadRequestException('El monto debe ser mayor a 0');
    }
    if (Math.round(monto * 100) !== monto * 100) {
      throw new BadRequestException('El monto admite hasta dos decimales');
    }
  }

  private validarReferencia(referencia: string) {
    const ref = referencia?.trim();
    if (!ref || ref.length > 100) {
      throw new BadRequestException('La referencia es obligatoria y admite hasta 100 caracteres');
    }
    return ref;
  }

  private async obtenerCliente(manager: EntityManager, id: number, lock = false) {
    const cliente = await manager.getRepository(Cliente).findOne({
      where: { id },
      ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });
    if (!cliente) throw new NotFoundException(`No existe el cliente ${id}`);
    if (!cliente.activo) throw new ConflictException(`El cliente ${id} está inactivo`);
    return cliente;
  }
}
