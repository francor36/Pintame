import { Test, TestingModule } from '@nestjs/testing';
import { CajaController } from './caja.controller';
import { CajaService } from './caja.service';

describe('CajaController', () => {
  let cajaController: CajaController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [CajaController],
      providers: [CajaService],
    }).compile();

    cajaController = app.get<CajaController>(CajaController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(cajaController.getHello()).toBe('Hello World!');
    });
  });
});
