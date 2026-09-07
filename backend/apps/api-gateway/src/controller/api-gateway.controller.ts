import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';

import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { ApiGatewayService } from '../services/api-gateway.service';

@ApiTags('Clientes')
@Controller('clientes')
export class ApiGatewayController {
  constructor(
    private readonly apiGatewayService: ApiGatewayService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Obtener todos los clientes',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de clientes obtenida correctamente',
  })
  listarClientes() {
    return this.apiGatewayService.listarClientes();
  }

  @Get(':id/saldo')
  @ApiOperation({
    summary: 'Consultar saldo disponible de un cliente',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del cliente',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Saldo obtenido correctamente',
  })
  obtenerSaldo(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.apiGatewayService.obtenerSaldo(id);
  }

  @Post(':id/saldo/ntdc')
  @ApiOperation({
    summary: 'Generar saldo a favor mediante una NTDC',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del cliente',
    example: 1,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        monto: {
          type: 'number',
          example: 50000,
        },
        referencia: {
          type: 'string',
          example: 'NTDC-00001',
        },
        observacion: {
          type: 'string',
          example: 'Devolución de producto',
        },
      },
      required: ['monto', 'referencia'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Saldo generado correctamente',
  })
  generarSaldoPorNtdc(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      monto: number;
      referencia: string;
      observacion?: string;
    },
  ) {
    return this.apiGatewayService.generarSaldoPorNtdc(
      id,
      body.monto,
      body.referencia,
      body.observacion,
    );
  }

  @Post(':id/saldo/consumir')
  @ApiOperation({
    summary: 'Consumir saldo disponible de un cliente',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del cliente',
    example: 1,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        monto: {
          type: 'number',
          example: 20000,
        },
        referencia: {
          type: 'string',
          example: 'VENTA-00152',
        },
        observacion: {
          type: 'string',
          example: 'Uso de saldo a favor',
        },
      },
      required: ['monto', 'referencia'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Saldo consumido correctamente',
  })
  consumirSaldo(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      monto: number;
      referencia: string;
      observacion?: string;
    },
  ) {
    return this.apiGatewayService.consumirSaldo(
      id,
      body.monto,
      body.referencia,
      body.observacion,
    );
  }

  @Post(':id/saldo/actualizar-vencimientos')
  @ApiOperation({
    summary: 'Actualizar saldos vencidos de un cliente',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del cliente',
    example: 1,
  })
  @ApiResponse({
    status: 201,
    description: 'Vencimientos actualizados correctamente',
  })
  actualizarVencimientos(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.apiGatewayService.actualizarVencimientos(id);
  }
  @Post()
@ApiOperation({
  summary: 'Crear un nuevo cliente',
})
@ApiBody({
  schema: {
    type: 'object',
    properties: {
      dni: {
        type: 'string',
        example: '30123456',
      },
      nombre: {
        type: 'string',
        example: 'Juan',
      },
      apellido: {
        type: 'string',
        example: 'Pérez',
      },
      email: {
        type: 'string',
        example: 'juan@email.com',
      },
      telefono: {
        type: 'string',
        example: '2995555555',
      },
      direccion: {
        type: 'string',
        example: 'Av. Argentina 123',
      },
    },
    required: ['dni', 'nombre', 'apellido'],
  },
})
crearCliente(
  @Body()
  body: {
    dni: string;
    nombre: string;
    apellido: string;
    email?: string;
    telefono?: string;
    direccion?: string;
  },
) {
  return this.apiGatewayService.crearCliente(body);
}

@Get(':id')
@ApiOperation({
  summary: 'Obtener un cliente por ID',
})
@ApiParam({
  name: 'id',
  description: 'ID del cliente',
  example: 1,
})
buscarCliente(
  @Param('id', ParseIntPipe) id: number,
) {
  return this.apiGatewayService.buscarCliente(id);
}
}