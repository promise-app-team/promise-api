import { Test } from '@nestjs/testing';

import { AppController } from '@/app';
import { TypedConfigService } from '@/config/env';

describe(AppController, () => {
  let appController: AppController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: TypedConfigService, useValue: { get: (k: any) => k } }],
    }).compile();

    appController = module.get(AppController);
  });

  test('should be defined', () => {
    expect(appController).toBeInstanceOf(AppController);
  });

  describe(AppController.prototype.ping, () => {
    const result = {
      message: 'pong',
      version: 'version',
      build: 'build',
      deploy: 'deploy',
      env: 'env',
      tz: 'tz',
    };

    test('should return pong object', () => {
      expect(appController.ping()).toEqual(result);
    });
  });
});
