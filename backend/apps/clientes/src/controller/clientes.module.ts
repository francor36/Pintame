import { Module } from '@nestjs/common';
import { ClientesController } from './clientes.controller';
import { ClientesService } from '../services/clientes.service';
import { AppModule } from '../app.module';

@Module({
  imports: [AppModule],
  controllers: [ClientesController],
  providers: [ClientesService],
})
export class ClientesModule {}
