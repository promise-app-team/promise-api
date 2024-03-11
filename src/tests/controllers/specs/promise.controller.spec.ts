import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';

import { TypedConfigService } from '@/config/env';
import { InthashService } from '@/customs/inthash/inthash.service';
import { PromiseController } from '@/modules/promise/promise.controller';
import { EncodePromiseID } from '@/modules/promise/promise.interceptor';
import { PromiseService } from '@/modules/promise/promise.service';
import { UserService } from '@/modules/user/user.service';
import { PrismaService } from '@/prisma/prisma.service';

describe(PromiseController, () => {
  let promiseController: PromiseController;
  let prisma: PrismaService;

  beforeAll(async () => {
    prisma = new PrismaService();
  });

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [PromiseController],
      providers: [
        PromiseService,
        EncodePromiseID,
        { provide: PrismaService, useValue: prisma },
        { provide: TypedConfigService, useValue: {} },
        { provide: InthashService, useValue: {} },
        { provide: CACHE_MANAGER, useValue: {} },
        { provide: JwtService, useValue: {} },
        { provide: UserService, useValue: {} },
      ],
    }).compile();

    promiseController = module.get(PromiseController);
  });

  test('should be defined', () => {
    expect(promiseController).toBeInstanceOf(PromiseController);
  });

  describe(PromiseController.prototype.getMyPromises, () => {
    test('should return a list of promises', async () => {});

    test('should return a list of promises with status filter', async () => {});

    test('should return a list of promises with role filter', async () => {});

    test('should return a list of promises with status and role filter', async () => {});

    test('should throw an error if the user is not found', async () => {});

    // test('should throw an error if the status is invalid', async () => {});

    // test('should throw an error if the role is invalid', async () => {});

    test('should throw an error when unknown error occurs', async () => {});
  });

  describe(PromiseController.prototype.getPromise, () => {
    test('should return a promise', async () => {});

    test('should throw an error if the promise is not found', async () => {});

    test('should throw an error when unknown error occurs', async () => {});
  });

  describe(PromiseController.prototype.createPromise, () => {
    test('should create a promise', async () => {});

    test('should throw an error when unknown error occurs', async () => {});
  });

  describe(PromiseController.prototype.updatePromise, () => {
    test('should update a promise', async () => {});

    test('should throw an error if the promise is not found', async () => {});

    test('should throw an error when unknown error occurs', async () => {});
  });

  describe(PromiseController.prototype.attendPromise, () => {
    test('should attend a promise', async () => {});

    test('should throw an error if the promise is not found', async () => {});

    test('should throw an error if the user is already attending the promise', async () => {});

    test('should throw an error when unknown error occurs', async () => {});
  });

  describe(PromiseController.prototype.leavePromise, () => {
    test('should leave a promise', async () => {});

    test('should throw an error if the promise is not found', async () => {});

    test('should throw an error if the user is host of the promise', async () => {});

    test('should throw an error when unknown error occurs', async () => {});
  });

  describe(PromiseController.prototype.getStartLocation, () => {
    test('should return a start location', async () => {});

    test('should throw an error if the promise is not found', async () => {});

    test('should throw an error if the start location is not found', async () => {});

    test('should throw an error when unknown error occurs', async () => {});
  });

  describe(PromiseController.prototype.updateStartLocation, () => {
    test('should update a start location', async () => {});

    test('should throw an error if the promise is not found', async () => {});

    test('should throw an error when unknown error occurs', async () => {});
  });

  describe(PromiseController.prototype.deleteStartLocation, () => {});

  describe(PromiseController.prototype.getThemes, () => {});

  describe(PromiseController.prototype.dequeuePromise, () => {});

  describe(PromiseController.prototype.enqueuePromise, () => {});
});
