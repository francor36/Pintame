import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { FacturacionService } from './facturacion.service';

@Controller()
export class FacturacionController {
  constructor(private readonly facturacionService: FacturacionService) {}

  @MessagePattern({ cmd: 'facturacion.listar' })
  listar() {
    return this.facturacionService.listar();
  }

  @MessagePattern({ cmd: 'facturacion.buscar' })
  buscar({ id }: { id: number }) {
    return this.facturacionService.obtener(id);
  }

  @MessagePattern({ cmd: 'facturacion.venta' })
  porVenta({ ventaId }: { ventaId: number }) {
    return this.facturacionService.porVenta(ventaId);
  }

  @MessagePattern({ cmd: 'facturacion.emitir' })
  emitir({ ventaId, ...input }: {
    ventaId: number;
    clienteNombre?: string;
    clienteDocumento?: string;
    observacion?: string;
  }) {
    return this.facturacionService.emitirPorVenta(ventaId, input);
  }
}
