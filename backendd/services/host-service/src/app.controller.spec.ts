import { Test, TestingModule } from '@nestjs/testing';
import { HostController } from './app.controller';
import { HostService } from './app.service';

describe('AppController', () => {
  let appController: HostController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [HostController],
      providers: [HostService],
    }).compile();

    appController = app.get<HostController>(HostController);
  });

});
