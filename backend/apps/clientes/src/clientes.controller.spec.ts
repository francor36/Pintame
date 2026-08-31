import { Test, TestingModule } from '@nestjs/testing';
import { ClientesController } from './clientes.controller';
import { ClientesService } from './clientes.service';

describe('ClientesController', () => {
  let clientesController: ClientesController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [ClientesController],
      providers: [ClientesService],
    }).compile();

    clientesController = app.get<ClientesController>(ClientesController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(clientesController.getHello()).toBe('Hello World!');
    });
  });
});
