import { Test, TestingModule } from '@nestjs/testing';
import { PropertyController } from './app.controller';
import { PropertyService } from './app.service';

describe('AppController', () => {
  let appController: PropertyController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [PropertyController],
      providers: [PropertyService],
    }).compile();

    appController = app.get<PropertyController>(PropertyController);
  });


});
