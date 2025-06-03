import { Test, TestingModule } from '@nestjs/testing';
import { BookingController } from './app.controller';
import { BookingService } from './app.service';

describe('AppController', () => {
  let appController: BookingController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [BookingController],
      providers: [BookingService],
    }).compile();

    appController = app.get<BookingController>(BookingController);
  });

  /*describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });*/
});
