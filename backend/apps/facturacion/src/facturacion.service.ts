import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import type { Pool } from 'mariadb';
import { firstValueFrom, timeout } from 'rxjs';

type Venta = {
  id: number;
  numero: string;
  estado: string;
  subtotal: number | string;
  total: number | string;
  fecha: Date | string;
  detalles: Array<{
    productoId: number | string;
    descripcion: string;
    cantidad: number | string;
    precioUnitario: number | string;
    subtotal: number | string;
  }>;
};

type EmitirFacturaInput = {
  clienteNombre?: string;
  clienteDocumento?: string;
  observacion?: string;
};

@Injectable()
export class FacturacionService implements OnModuleInit, OnModuleDestroy {
  constructor(
    @Inject('FACTURACION_DB') private readonly pool: Pool,
    @Inject('VENTAS_SERVICE') private readonly ventasClient: ClientProxy,
  ) {}

  async onModuleInit() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS facturas_b_internas (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        numero VARCHAR(24) NOT NULL UNIQUE,
        venta_id INT NOT NULL UNIQUE,
        numero_venta VARCHAR(30) NOT NULL,
        tipo CHAR(1) NOT NULL DEFAULT 'B',
        estado VARCHAR(24) NOT NULL DEFAULT 'EMITIDA_INTERNA',
        cliente_nombre VARCHAR(150) NOT NULL,
        cliente_documento VARCHAR(30) NULL,
        subtotal DECIMAL(12, 2) NOT NULL,
        total DECIMAL(12, 2) NOT NULL,
        moneda CHAR(3) NOT NULL DEFAULT 'ARS',
        observacion VARCHAR(500) NULL,
        detalles JSON NOT NULL,
        autorizacion_arca VARCHAR(60) NULL DEFAULT NULL,
        fecha_emision TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  async listar() {
    const rows = await this.pool.query(
      'SELECT * FROM facturas_b_internas ORDER BY fecha_emision DESC, id DESC LIMIT 200',
    );
    return rows.map((row: Record<string, any>) => this.publica(row));
  }

  async obtener(id: number) {
    const rows = await this.pool.query(
      'SELECT * FROM facturas_b_internas WHERE id = ? LIMIT 1',
      [id],
    );
    if (!rows[0]) throw new NotFoundException(`No existe el comprobante ${id}`);
    return this.publica(rows[0]);
  }

  async porVenta(ventaId: number) {
    const rows = await this.pool.query(
      'SELECT * FROM facturas_b_internas WHERE venta_id = ? LIMIT 1',
      [ventaId],
    );
    if (!rows[0]) throw new NotFoundException(`La venta ${ventaId} todavía no tiene comprobante`);
    return this.publica(rows[0]);
  }

  async emitirPorVenta(ventaId: number, input: EmitirFacturaInput = {}) {
    if (!Number.isInteger(ventaId) || ventaId <= 0) {
      throw new BadRequestException('El ID de venta debe ser un entero positivo');
    }

    const previa = await this.buscarFilaVenta(ventaId);
    if (previa) return this.publica(previa);

    let venta: Venta;
    try {
      venta = await firstValueFrom(
        this.ventasClient
          .send<Venta>({ cmd: 'ventas.buscar' }, { id: ventaId })
          .pipe(timeout(8000)),
      );
    } catch (error) {
      if (this.esNotFound(error)) throw new NotFoundException(`No existe la venta ${ventaId}`);
      throw new ServiceUnavailableException('No se pudo consultar el servicio de Ventas');
    }
    if (venta.estado !== 'PAGADA') {
      throw new ConflictException('Solo se puede emitir un comprobante para una venta PAGADA');
    }
    if (!Array.isArray(venta.detalles) || venta.detalles.length === 0) {
      throw new ConflictException('La venta no contiene detalles para facturar');
    }

    const clienteNombre = input.clienteNombre?.trim() || 'Consumidor Final';
    const clienteDocumento = input.clienteDocumento?.trim() || null;
    const observacion = input.observacion?.trim() || null;
    if (clienteNombre.length > 150 || (clienteDocumento?.length ?? 0) > 30 || (observacion?.length ?? 0) > 500) {
      throw new BadRequestException('Los datos del comprobante superan la longitud permitida');
    }

    const numero = `B-${String(venta.id).padStart(8, '0')}`;
    const detalles = venta.detalles.map((linea) => ({
      productoId: Number(linea.productoId),
      descripcion: String(linea.descripcion),
      cantidad: String(linea.cantidad),
      precioUnitario: String(linea.precioUnitario),
      subtotal: String(linea.subtotal),
    }));

    try {
      const result = await this.pool.query(
        `INSERT INTO facturas_b_internas
          (numero, venta_id, numero_venta, cliente_nombre, cliente_documento,
           subtotal, total, observacion, detalles)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          numero,
          venta.id,
          venta.numero,
          clienteNombre,
          clienteDocumento,
          String(venta.subtotal),
          String(venta.total),
          observacion,
          JSON.stringify(detalles),
        ],
      );
      return this.obtener(Number(result.insertId));
    } catch (error) {
      if ((error as { code?: string }).code === 'ER_DUP_ENTRY') {
        const existente = await this.buscarFilaVenta(ventaId);
        if (existente) return this.publica(existente);
      }
      throw error;
    }
  }

  private async buscarFilaVenta(ventaId: number): Promise<Record<string, any> | null> {
    const rows = await this.pool.query(
      'SELECT * FROM facturas_b_internas WHERE venta_id = ? LIMIT 1',
      [ventaId],
    );
    return rows[0] ?? null;
  }

  private publica(row: Record<string, any>) {
    let detalles = row.detalles;
    if (typeof detalles === 'string') {
      try {
        detalles = JSON.parse(detalles);
      } catch {
        detalles = [];
      }
    }
    return {
      id: Number(row.id),
      numero: row.numero,
      ventaId: Number(row.venta_id),
      numeroVenta: row.numero_venta,
      tipo: 'B',
      estado: row.estado,
      alcance: 'COMPROBANTE_INTERNO_SIN_ARCA_NI_CAE',
      clienteNombre: row.cliente_nombre,
      clienteDocumento: row.cliente_documento,
      subtotal: Number(row.subtotal),
      total: Number(row.total),
      moneda: row.moneda,
      observacion: row.observacion,
      detalles,
      autorizacionArca: null,
      fechaEmision: row.fecha_emision,
    };
  }

  private esNotFound(error: unknown) {
    if (typeof error !== 'object' || error === null) return false;
    const record = error as Record<string, unknown>;
    const nested = typeof record.error === 'object' && record.error !== null
      ? record.error as Record<string, unknown>
      : record;
    return nested.statusCode === 404 || nested.status === 404;
  }
}
