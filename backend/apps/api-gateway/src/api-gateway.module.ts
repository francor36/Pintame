import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

import { ApiGatewayController } from './controller/api-gateway.controller';
import { ApiGatewayService } from './services/api-gateway.service';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'CLIENTES_SERVICE',
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 3001,
        },
      },
    ]),
  ],
  controllers: [ApiGatewayController],
  providers: [ApiGatewayService],
})
export class ApiGatewayModule {}