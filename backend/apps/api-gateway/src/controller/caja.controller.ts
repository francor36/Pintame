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

@ApiTags('Caja')
@Controller('caja')
export class CajaController {
  constructor(
    private readonly apiGatewayService: ApiGatewayService,
  ) { }

  // =====================================================
  // ABRIR CAJA
  // =====================================================

  @Post('abrir')
  @ApiOperation({
    summary: 'Abrir una nueva caja',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        montoInicial: {
          type: 'number',
          example: 50000,
        },
      },
      required: ['montoInicial'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Caja abierta correctamente',
  })
  abrirCaja(
    @Body()
    body: {
      montoInicial: number;
    },
  ) {
    return this.apiGatewayService.abrirCaja(
      body.montoInicial,
    );
  }

  // =====================================================
  // CAJA ABIERTA
  // =====================================================

  @Get('abierta')
  @ApiOperation({
    summary: 'Obtener la caja actualmente abierta',
  })
  @ApiResponse({
    status: 200,
    description: 'Caja abierta obtenida correctamente',
  })
  obtenerCajaAbierta() {
    return this.apiGatewayService.obtenerCajaAbierta();
  }

  // =====================================================
  // BUSCAR CAJA
  // =====================================================

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener una caja por ID',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la caja',
    example: 1,
  })
  buscarCaja(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.apiGatewayService.buscarCaja(id);
  }

  // =====================================================
  // INGRESO
  // =====================================================

  @Post('ingreso')
  @ApiOperation({
    summary: 'Registrar un ingreso en caja',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        monto: {
          type: 'number',
          example: 25000,
        },
        descripcion: {
          type: 'string',
          example: 'Ingreso de efectivo',
        },
        referencia: {
          type: 'string',
          example: 'ING-00001',
        },
      },
      required: ['monto'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Ingreso registrado correctamente',
  })
  registrarIngreso(
    @Body()
    body: {
      monto: number;
      descripcion?: string;
      referencia?: string;
    },
  ) {
    return this.apiGatewayService.registrarIngreso(
      body.monto,
      body.descripcion,
      body.referencia,
    );
  }

  // =====================================================
  // RETIRO
  // =====================================================

  @Post('retiro')
  @ApiOperation({
    summary: 'Registrar un retiro de caja',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        monto: {
          type: 'number',
          example: 10000,
        },
        descripcion: {
          type: 'string',
          example: 'Retiro para gastos',
        },
        referencia: {
          type: 'string',
          example: 'RET-00001',
        },
      },
      required: ['monto'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Retiro registrado correctamente',
  })
  registrarRetiro(
    @Body()
    body: {
      monto: number;
      descripcion?: string;
      referencia?: string;
    },
  ) {
    return this.apiGatewayService.registrarRetiro(
      body.monto,
      body.descripcion,
      body.referencia,
    );
  }

  // =====================================================
  // MOVIMIENTOS
  // =====================================================

  @Get(':id/movimientos')
  @ApiOperation({
    summary: 'Obtener movimientos de una caja',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la caja',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Movimientos obtenidos correctamente',
  })
  obtenerMovimientos(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.apiGatewayService.obtenerMovimientos(id);
  }


  // =====================================================
  // CERRAR CAJA
  // =====================================================

  @Post('cerrar')
  @ApiOperation({
    summary: 'Cerrar la caja actualmente abierta',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        observacion: {
          type: 'string',
          example: 'Cierre de caja turno mañana',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Caja cerrada correctamente',
  })
  cerrarCaja(
    @Body()
    body: {
      observacion?: string;
    },
  ) {
    return this.apiGatewayService.cerrarCaja(
      body.observacion,
    );
  }

}   
