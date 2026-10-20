import { Test, TestingModule } from '@nestjs/testing';
import { FacturacionController } from './facturacion.controller';
import { FacturacionService } from './facturacion.service';

describe('FacturacionController', () => {
  let facturacionController: FacturacionController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [FacturacionController],
      providers: [FacturacionService],
    }).compile();

    facturacionController = app.get<FacturacionController>(FacturacionController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(facturacionController.getHello()).toBe('Hello World!');
    });
  });
});
