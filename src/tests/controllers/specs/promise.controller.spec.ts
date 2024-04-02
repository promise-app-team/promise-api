import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { times } from 'remeda';

import { TypedConfigService } from '@/config/env';
import { InthashService } from '@/customs/inthash/inthash.service';
import { PromiseController } from '@/modules/promise/promise.controller';
import { EncodePromiseID } from '@/modules/promise/promise.interceptor';
import { PromiseService } from '@/modules/promise/promise.service';
import { UserService } from '@/modules/user/user.service';
import { PrismaService } from '@/prisma/prisma.service';
import { createPromiseBuilder } from '@/tests/fixtures/promises';
import { createUserBuilder } from '@/tests/fixtures/users';
import { createPrismaClient } from '@/tests/prisma';

const createUser = createUserBuilder(3e6);
const createPromise = createPromiseBuilder(3e6);

describe(PromiseController, () => {
  let promiseController: PromiseController;
  const prisma = createPrismaClient({ logging: false });

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
    test('should return a list of promises', async () => {
      const authUser = createUser();
      const host = await prisma.user.create({ data: authUser });
      const inputPromises = times(3, () => createPromise({ hostId: host.id }));
      await prisma.promise.createMany({ data: inputPromises });
      await prisma.promiseUser.createMany({
        data: inputPromises.map(({ id }) => ({ userId: host.id, promiseId: id })),
      });

      await expect(promiseController.getMyPromises(authUser)).resolves.toHaveLength(3);
    });

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
