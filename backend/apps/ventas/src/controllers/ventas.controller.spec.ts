import { Test, TestingModule } from '@nestjs/testing';
import { VentasController } from './ventas.controller';
import { VentasService } from './ventas.service';

describe('VentasController', () => {
  let ventasController: VentasController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [VentasController],
      providers: [VentasService],
    }).compile();

    ventasController = app.get<VentasController>(VentasController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(ventasController.getHello()).toBe('Hello World!');
    });
  });
});
