import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';

import { TypedConfigService } from '@/config/env';
import { CacheModule, InMemoryCacheService } from '@/customs/cache';
import { IntHashService } from '@/customs/inthash';
import { SqidsService } from '@/customs/sqids/sqids.service';
import { JwtAuthTokenService } from '@/modules/auth';
import { PromiseController, PromiseService, EncodePromiseID } from '@/modules/promise';
import { UserService } from '@/modules/user';
import { PrismaService } from '@/prisma';
import { createPrismaClient } from '@/tests/setups/prisma';

describe(PromiseController, () => {
  let promiseController: PromiseController;
  const prisma = createPrismaClient({ logging: false });
  // const fixture = createTestFixture(prisma, { from: 3e6, to: 4e6 });

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [
        CacheModule.register({
          service: new InMemoryCacheService(),
        }),
      ],
      controllers: [PromiseController],
      providers: [
        PromiseService,
        EncodePromiseID,
        TypedConfigService,
        ConfigService,
        { provide: SqidsService, useValue: new SqidsService() },
        { provide: PrismaService, useValue: prisma },
        { provide: IntHashService, useValue: {} },
        { provide: JwtAuthTokenService, useValue: {} },
        { provide: UserService, useValue: {} },
      ],
    }).compile();

    promiseController = module.get(PromiseController);
  });

  test('should be defined', () => {
    expect(promiseController).toBeInstanceOf(PromiseController);
  });

  describe(PromiseController.prototype.getMyPromises, () => {});

  describe(PromiseController.prototype.getPromise, () => {
    test('should throw an error when unknown error occurs', async () => {
      await expect(promiseController.getPromise('unknown' as any)).rejects.toThrow();
    });
  });

  describe(PromiseController.prototype.createPromise, () => {});

  describe(PromiseController.prototype.updatePromise, () => {
    test('should throw an error when unknown error occurs', async () => {
      await expect(
        promiseController.updatePromise({ id: 'unknown' as any }, 'unknown' as any, {} as any)
      ).rejects.toMatchObject({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    });
  });

  describe(PromiseController.prototype.attendPromise, () => {
    test('should throw an error when unknown error occurs', async () => {
      await expect(promiseController.attendPromise({ id: 'unknown' as any }, 'unknown' as any)).rejects.toMatchObject({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    });
  });

  describe(PromiseController.prototype.leavePromise, () => {
    test('should throw an error when unknown error occurs', async () => {
      await expect(promiseController.leavePromise({ id: 'unknown' as any }, 'unknown' as any)).rejects.toMatchObject({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    });
  });

  describe(PromiseController.prototype.getStartLocation, () => {
    test('should throw an error when unknown error occurs', async () => {
      await expect(
        promiseController.getStartLocation({ id: 'unknown' as any }, 'unknown' as any)
      ).rejects.toMatchObject({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    });
  });

  describe(PromiseController.prototype.updateStartLocation, () => {
    test('should throw an error when unknown error occurs', async () => {
      await expect(
        promiseController.updateStartLocation({ id: 'unknown' as any }, 'unknown' as any, {} as any)
      ).rejects.toMatchObject({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    });
  });

  describe(PromiseController.prototype.deleteStartLocation, () => {
    test('should throw an error when unknown error occurs', async () => {
      await expect(
        promiseController.deleteStartLocation({ id: 'unknown' as any }, 'unknown' as any)
      ).rejects.toMatchObject({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    });
  });

  describe(PromiseController.prototype.getMiddleLocation, () => {});

  describe(PromiseController.prototype.delegatePromise, () => {
    test('should throw an error when unknown error occurs', async () => {
      await expect(
        promiseController.delegatePromise({ id: 'unknown' as any }, 'unknown' as any, 'unknown' as any)
      ).rejects.toMatchObject({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    });
  });

  describe(PromiseController.prototype.completePromise, () => {
    test('should throw an error when unknown error occurs', async () => {
      await expect(promiseController.completePromise({ id: 'unknown' as any }, 'unknown' as any)).rejects.toMatchObject(
        { status: HttpStatus.INTERNAL_SERVER_ERROR }
      );
    });
  });

  describe(PromiseController.prototype.enqueuePromise, () => {});

  describe(PromiseController.prototype.dequeuePromise, () => {});
});
