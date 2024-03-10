import { Test } from '@nestjs/testing';

import { AppController } from '@/app/app.controller';
import { TypedConfigService } from '@/config/env';
import { MockTypedConfigService } from '@/tests/services/mocks/typed-config.service.mock';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: TypedConfigService, useValue: MockTypedConfigService }],
    }).compile();

    appController = module.get(AppController);
  });

  test('should be defined', () => {
    expect(appController).toBeDefined();
  });

  describe('root', () => {
    const result = {
      message: 'pong',
      version: 'version',
      build: 'build',
      deploy: 'deploy',
      env: 'env',
      tz: 'tz',
    };

    it('should return pong object', () => {
      expect(appController.ping()).toEqual(result);
    });
  });
});
