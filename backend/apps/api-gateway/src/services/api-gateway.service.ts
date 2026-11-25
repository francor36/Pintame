import { Inject, Injectable } from '@nestjs/common';

import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class ApiGatewayService {
  constructor(
    @Inject('CLIENTES_SERVICE')
    private readonly clientesClient: ClientProxy,

    @Inject('CAJA_SERVICE')
    private readonly cajaClient: ClientProxy,

    @Inject('VENTAS_SERVICE')
    private readonly ventasClient: ClientProxy,

    @Inject('STOCK_SERVICE')
    private readonly stockClient: ClientProxy,
  ) { }

  // =====================================================
  // CLIENTES
  // =====================================================

  listarClientes() {
    return this.clientesClient.send(
      { cmd: 'clientes.listar' },
      {},
    );
  }

  obtenerSaldo(clienteId: number) {
    return this.clientesClient.send(
      { cmd: 'saldo.obtener' },
      {
        clienteId,
      },
    );
  }

  generarSaldoPorNtdc(
    clienteId: number,
    monto: number,
    referencia: string,
    observacion?: string,
  ) {
    return this.clientesClient.send(
      { cmd: 'saldo.generar-ntdc' },
      {
        clienteId,
        monto,
        referencia,
        observacion,
      },
    );
  }

  consumirSaldo(
    clienteId: number,
    monto: number,
    referencia: string,
    observacion?: string,
  ) {
    return this.clientesClient.send(
      { cmd: 'saldo.consumir' },
      {
        clienteId,
        monto,
        referencia,
        observacion,
      },
    );
  }

  actualizarVencimientos(clienteId: number) {
    return this.clientesClient.send(
      { cmd: 'saldo.actualizar-vencimientos' },
      {
        clienteId,
      },
    );
  }

  crearCliente(data: {
    dni: string;
    nombre: string;
    apellido: string;
    email?: string;
    telefono?: string;
    direccion?: string;
  }) {
    return this.clientesClient.send(
      { cmd: 'clientes.crear' },
      data,
    );
  }

  buscarCliente(clienteId: number) {
    return this.clientesClient.send(
      { cmd: 'clientes.buscar' },
      {
        id: clienteId,
      },
    );
  }

  desactivarCliente(clienteId: number) {
    return this.clientesClient.send(
      { cmd: 'clientes.desactivar' },
      { id: clienteId },
    );
  }

  activarCliente(clienteId: number) {
    return this.clientesClient.send(
      { cmd: 'clientes.activar' },
      { id: clienteId },
    );
  }


  // =====================================================
  // CAJA
  // =====================================================

  abrirCaja(montoInicial: number, usuarioAperturaId?: number, usuarioAperturaNombre?: string) {
    return this.cajaClient.send(
      { cmd: 'caja.abrir' },
      {
        montoInicial,
        usuarioAperturaId,
        usuarioAperturaNombre,
      },
    );
  }

  obtenerCajaAbierta() {
    return this.cajaClient.send(
      { cmd: 'caja.abierta' },
      {},
    );
  }

  buscarCaja(id: number) {
    return this.cajaClient.send(
      { cmd: 'caja.buscar' },
      {
        id,
      },
    );
  }

  listarCajas() {
    return this.cajaClient.send({ cmd: 'caja.listar' }, {});
  }

  registrarIngreso(
    monto: number,
    descripcion?: string,
    referencia?: string,
  ) {
    return this.cajaClient.send(
      { cmd: 'caja.ingreso' },
      {
        monto,
        descripcion,
        referencia,
      },
    );
  }

  registrarRetiro(
    monto: number,
    descripcion?: string,
    referencia?: string,
  ) {
    return this.cajaClient.send(
      { cmd: 'caja.retiro' },
      {
        monto,
        descripcion,
        referencia,
      },
    );
  }

  obtenerMovimientos(cajaId: number) {
    return this.cajaClient.send(
      { cmd: 'caja.movimientos' },
      {
        cajaId,
      },
    );
  }
  cerrarCaja(observacion?: string, usuarioCierreId?: number, usuarioCierreNombre?: string) {
    return this.cajaClient.send(
      { cmd: 'caja.cerrar' },
      {
        observacion,
        usuarioCierreId,
        usuarioCierreNombre,
      },
    );
  }
  // =====================================================
  // VENTAS
  // =====================================================

  probarVentas() {
    return this.ventasClient.send(
      { cmd: 'ventas.prueba' },
      {},
    );
  }

  listarVentas(usuarioId?: number) {
    return this.ventasClient.send({ cmd: 'ventas.listar' }, { usuarioId });
  }

  buscarVenta(id: number, usuarioId?: number) {
    return this.ventasClient.send({ cmd: 'ventas.buscar' }, { id, usuarioId });
  }

  crearVenta(data: {
    detalles: Array<{ productoId: number; cantidad: number }>;
    observacion?: string;
    usuarioId: number;
    usuarioNombre: string;
    ubicacionLatitud?: number;
    ubicacionLongitud?: number;
  }) {
    return this.ventasClient.send({ cmd: 'ventas.crear' }, data);
  }

  confirmarVenta(id: number, usuarioId?: number) {
    return this.ventasClient.send({ cmd: 'ventas.confirmar' }, { id, usuarioId });
  }

  reintentarConfirmacionVenta(id: number) {
    return this.ventasClient.send({ cmd: 'ventas.reintentar-confirmacion' }, { id });
  }

  anularVenta(id: number, usuarioId?: number) {
    return this.ventasClient.send({ cmd: 'ventas.anular' }, { id, usuarioId });
  }

  // STOCK
  listarProductos() {
    return this.stockClient.send({ cmd: 'stock.productos.listar' }, {});
  }

  crearProducto(data: Record<string, unknown>) {
    return this.stockClient.send({ cmd: 'stock.productos.crear' }, data);
  }

  buscarProducto(id: number) {
    return this.stockClient.send({ cmd: 'stock.productos.buscar' }, { id });
  }

  actualizarProducto(id: number, data: Record<string, unknown>) {
    return this.stockClient.send(
      { cmd: 'stock.productos.actualizar' },
      { id, data },
    );
  }

  registrarMovimiento(data: Record<string, unknown>) {
    return this.stockClient.send({ cmd: 'stock.movimientos.crear' }, data);
  }

  listarMovimientos(productoId: number) {
    return this.stockClient.send(
      { cmd: 'stock.movimientos.listar' },
      { productoId },
    );
  }
}
