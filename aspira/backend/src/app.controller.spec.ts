import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('health', () => {
    it('liefert status "ok" und einen Zeitstempel', () => {
      const health = appController.getHealth();
      expect(health.status).toBe('ok');
      expect(typeof health.zeit).toBe('string');
      // Der Zeitstempel muss ein gültiges ISO-Datum sein.
      expect(Number.isNaN(Date.parse(health.zeit))).toBe(false);
    });
  });
});
