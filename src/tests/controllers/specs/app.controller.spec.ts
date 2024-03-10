import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';

import { AppController } from '@/app/app.controller';
import { TypedConfigService } from '@/common';

describe('AppController', () => {
  let appController: AppController;
  let typedConfigService: TypedConfigService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        TypedConfigService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    appController = module.get(AppController);
    typedConfigService = module.get(TypedConfigService);
  });

  describe('root', () => {
    const result = {
      message: 'pong',
      version: '0.0.0',
      build: '0',
      deploy: '0',
      env: 'env',
      tz: 'tz',
    };

    it('should return pong object', () => {
      jest.spyOn(typedConfigService, 'get').mockImplementation((key) => result[key as never]);
      expect(appController.ping()).toEqual(result);
    });
  });
});
