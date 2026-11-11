import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { RpcException } from '@nestjs/microservices';
import { CajaService } from '../services/caja.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

@Controller()
export class CajaController {
  constructor(
    private readonly cajaService: CajaService,
  ) { }

  // =========================
  // ABRIR CAJA
  // =========================

  @MessagePattern({ cmd: 'caja.abrir' })
  async abrirCaja(data: {
    montoInicial: number;
  }) {
    try {
      return await this.cajaService.abrirCaja(
        data.montoInicial,
      );
    } catch (error) {
      if (error instanceof ConflictException) {
        throw new RpcException({
          statusCode: 409,
          message: error.message,
        });
      }

      throw error;
    }
  }

  // =========================
  // CAJA ABIERTA
  // =========================

  @MessagePattern({ cmd: 'caja.abierta' })
  obtenerCajaAbierta() {
    return this.cajaService.obtenerCajaAbierta();
  }

  // =========================
  // BUSCAR CAJA
  // =========================

  @MessagePattern({ cmd: 'caja.buscar' })
  obtenerPorId(data: {
    id: number;
  }) {
    return this.cajaService.obtenerPorId(data.id);
  }

  // =========================
  // INGRESO
  // =========================

  @MessagePattern({ cmd: 'caja.ingreso' })
  registrarIngreso(data: {
    monto: number;
    descripcion?: string;
    referencia?: string;
  }) {
    return this.cajaService.registrarIngreso(
      data.monto,
      data.descripcion,
      data.referencia,
    );
  }

  @MessagePattern({ cmd: 'caja.venta' })
  async registrarVenta(data: {
    monto: number;
    descripcion?: string;
    referencia?: string;
  }) {
    try {
      return await this.cajaService.registrarVenta(
        data.monto,
        data.descripcion,
        data.referencia,
      );
    } catch (error) {
      if (error instanceof ConflictException || error instanceof NotFoundException) {
        throw new RpcException({
          statusCode: error instanceof ConflictException ? 409 : 404,
          message: error.message,
        });
      }
      throw error;
    }
  }

  // =========================
  // RETIRO
  // =========================

  @MessagePattern({ cmd: 'caja.retiro' })
  registrarRetiro(data: {
    monto: number;
    descripcion?: string;
    referencia?: string;
  }) {
    return this.cajaService.registrarRetiro(
      data.monto,
      data.descripcion,
      data.referencia,
    );
  }
  // =========================
  // LISTAR MOVIMIENTOS
  // =========================

  @MessagePattern({ cmd: 'caja.movimientos' })
  obtenerMovimientos(data: {
    cajaId: number;
  }) {
    return this.cajaService.obtenerMovimientos(
      data.cajaId,
    );
  }

  // =========================
  // CERRAR CAJA
  // =========================

  @MessagePattern({ cmd: 'caja.cerrar' })
  cerrarCaja(data: {
    observacion?: string;
  }) {
    return this.cajaService.cerrarCaja(
      data.observacion,
    );
  }
}
