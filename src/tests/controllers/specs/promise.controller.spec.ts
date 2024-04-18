import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { formatISO } from 'date-fns';
import * as R from 'remeda';

import { mockGlobalFn } from '../mocks';

import { TypedConfigService } from '@/config/env';
import { CacheModule, InMemoryCacheService } from '@/customs/cache';
import { InthashService } from '@/customs/inthash';
import {
  PromiseController,
  InputCreatePromiseDTO,
  InputLocationDTO,
  InputUpdatePromiseDTO,
  PromiseStatus,
  PromiseUserRole,
  PromiseService,
} from '@/modules/promise';
import { EncodePromiseID } from '@/modules/promise/promise.interceptor';
import { UserService } from '@/modules/user';
import { PrismaService } from '@/prisma';
import { createTestFixture } from '@/tests/fixtures';
import { createPrismaClient } from '@/tests/setups/prisma';

describe(PromiseController, () => {
  let promiseController: PromiseController;
  const prisma = createPrismaClient({ logging: false });
  const fixture = createTestFixture(prisma, { from: 3e6, to: 4e6 });
  const tomorrow = new Date(fixture.date.tomorrow);
  const yesterday = new Date(fixture.date.yesterday);

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
        { provide: PrismaService, useValue: prisma },
        { provide: InthashService, useValue: {} },
        { provide: JwtService, useValue: {} },
        { provide: UserService, useValue: {} },
      ],
    }).compile();

    promiseController = module.get(PromiseController);
  });

  test('should be defined', () => {
    expect(promiseController).toBeInstanceOf(PromiseController);
  });

  const picks = <T extends Record<string, any>, K extends keyof T>(arr: T[], keys: K[]) =>
    arr.map((x) => R.pick(x, keys));

  describe(PromiseController.prototype.getMyPromises, () => {
    test('should return a list of promises', async () => {
      const host = await fixture.write.user();
      const promises = R.pipe(
        await Promise.all(R.times(3, () => fixture.write.promise({ host }))),
        R.map(({ promise }) => promise.output),
        R.sortBy((p) => p.id)
      );

      const result = await promiseController.getMyPromises({ id: host.input.id });

      expect(result).toBeArrayOfSize(3);
      expect(result).toMatchObject(picks(promises, ['id']));
    });

    test.each(Object.values(PromiseStatus))('should return a list of promises with status (%s)', async (status) => {
      const host = await fixture.write.user();
      const [p1, p2, p3] = R.pipe(
        await Promise.all([
          fixture.write.promise({ host, partial: { promisedAt: tomorrow } }), // available
          fixture.write.promise({ host, partial: { promisedAt: yesterday } }), // unavailable
          fixture.write.promise({ host, partial: { promisedAt: tomorrow, completedAt: yesterday } }), // unavailable
        ]),
        R.map(({ promise }) => promise.output),
        R.sortBy((p) => p.id)
      );

      const result = await promiseController.getMyPromises({ id: host.input.id }, status);

      switch (status) {
        case PromiseStatus.AVAILABLE:
          expect(result).toBeArrayOfSize(1);
          expect(result).toMatchObject(picks([p1], ['id']));
          break;
        case PromiseStatus.UNAVAILABLE:
          expect(result).toBeArrayOfSize(2);
          expect(result).toMatchObject(picks([p2, p3], ['id']));
          break;
        case PromiseStatus.ALL:
          expect(result).toBeArrayOfSize(3);
          expect(result).toMatchObject(picks([p1, p2, p3], ['id']));
          break;
      }
    });

    test.each(Object.values(PromiseUserRole))(
      'should return a list of promises with role filter (%s)',
      async (role) => {
        const [[h1, p1], [h2, p2], [h3, p3]] = R.pipe(
          await Promise.all(R.times(3, () => fixture.write.promise())),
          R.map(({ host, promise }) => [host.output, promise.output] as const),
          R.sortBy(([, p]) => p.id)
        );

        /**
         * promise1: host1 [host1, host2]
         * promise2: host2 [host2, host3]
         * promise3: host3 [host3]
         */
        await prisma.promiseUser.create({ data: { promiseId: p1.id, userId: h2.id } });
        await prisma.promiseUser.create({ data: { promiseId: p2.id, userId: h3.id } });

        const getMyPromises = (id: number) => {
          return promiseController.getMyPromises({ id }, undefined, role);
        };

        switch (role) {
          case PromiseUserRole.HOST:
            await expect(getMyPromises(h1.id)).resolves.toMatchObject(picks([p1], ['id']));
            await expect(getMyPromises(h2.id)).resolves.toMatchObject(picks([p2], ['id']));
            await expect(getMyPromises(h3.id)).resolves.toMatchObject(picks([p3], ['id']));
            break;
          case PromiseUserRole.ATTENDEE:
            await expect(getMyPromises(h1.id)).resolves.toBeArrayOfSize(0);
            await expect(getMyPromises(h2.id)).resolves.toMatchObject(picks([p1], ['id']));
            await expect(getMyPromises(h3.id)).resolves.toMatchObject(picks([p2], ['id']));
            break;
          case PromiseUserRole.ALL:
            await expect(getMyPromises(h1.id)).resolves.toMatchObject(picks([p1], ['id']));
            await expect(getMyPromises(h2.id)).resolves.toMatchObject(picks([p1, p2], ['id']));
            await expect(getMyPromises(h3.id)).resolves.toMatchObject(picks([p2, p3], ['id']));
            break;
        }
      }
    );

    test.each([
      { status: PromiseStatus.AVAILABLE, role: PromiseUserRole.HOST },
      { status: PromiseStatus.AVAILABLE, role: PromiseUserRole.ATTENDEE },
      { status: PromiseStatus.AVAILABLE, role: PromiseUserRole.ALL },
      { status: PromiseStatus.UNAVAILABLE, role: PromiseUserRole.HOST },
      { status: PromiseStatus.UNAVAILABLE, role: PromiseUserRole.ATTENDEE },
      { status: PromiseStatus.UNAVAILABLE, role: PromiseUserRole.ALL },
      { status: PromiseStatus.ALL, role: PromiseUserRole.HOST },
      { status: PromiseStatus.ALL, role: PromiseUserRole.ATTENDEE },
      { status: PromiseStatus.ALL, role: PromiseUserRole.ALL },
    ])('should return a list of promises by condition (%o)', async (condition) => {
      const [[h1, p1], [h2, p2], [h3, p3], [h4, p4], [h5, p5], [h6, p6]] = R.pipe(
        await Promise.all([
          fixture.write.promise(),
          fixture.write.promise(),
          fixture.write.promise(),
          fixture.write.promise(),
          fixture.write.promise(),
          fixture.write.promise(),
        ]),
        R.map(({ host, promise }) => [host.output, promise.output] as const),
        R.sortBy(([, p]) => p.id)
      );
      const hx = await fixture.write.user.output();

      /**
       * promise1: host1 [host1]               available   (promisedAt = tomorrow)
       * promise2: host2 [host2, host3]        available   (promisedAt = tomorrow)
       * promise3: host3 [host3]               unavailable (promisedAt = yesterday)
       * promise4: host4 [host4, host5]        unavailable (promisedAt = yesterday)
       * promise5: host5 [host5, host1, host4] available   (promisedAt = tomorrow, completedAt = null)
       * promise6: host6 [host6, host1, host4] unavailable (promisedAt = tomorrow, completedAt = yesterday)
       */
      R.pipe(
        await Promise.all([
          prisma.promise.update({ where: { id: p1.id }, data: { promisedAt: tomorrow } }),
          prisma.promise.update({ where: { id: p2.id }, data: { promisedAt: tomorrow } }),
          prisma.promise.update({ where: { id: p3.id }, data: { promisedAt: yesterday } }),
          prisma.promise.update({ where: { id: p4.id }, data: { promisedAt: yesterday } }),
          prisma.promise.update({ where: { id: p5.id }, data: { promisedAt: tomorrow, completedAt: null } }),
          prisma.promise.update({ where: { id: p6.id }, data: { promisedAt: tomorrow, completedAt: yesterday } }),
        ]),
        R.zip([p1, p2, p3, p4, p5, p6])
      ).forEach(([src, dest]) => R.merge(src, dest));

      await Promise.all([
        prisma.promiseUser.create({ data: { userId: h3.id, promiseId: p2.id } }),
        prisma.promiseUser.create({ data: { userId: h5.id, promiseId: p4.id } }),
        prisma.promiseUser.create({ data: { userId: h1.id, promiseId: p5.id } }),
        prisma.promiseUser.create({ data: { userId: h4.id, promiseId: p5.id } }),
        prisma.promiseUser.create({ data: { userId: h1.id, promiseId: p6.id } }),
        prisma.promiseUser.create({ data: { userId: h4.id, promiseId: p6.id } }),
      ]);

      const getMyPromises = (id: number) => {
        return promiseController.getMyPromises({ id }, condition.status, condition.role);
      };

      if (condition.status === PromiseStatus.AVAILABLE) {
        if (condition.role === PromiseUserRole.HOST) {
          expect(await getMyPromises(h1.id)).toMatchObject(picks([p1], ['id']));
          expect(await getMyPromises(h2.id)).toMatchObject(picks([p2], ['id']));
          expect(await getMyPromises(h3.id)).toBeArrayOfSize(0);
          expect(await getMyPromises(h4.id)).toBeArrayOfSize(0);
          expect(await getMyPromises(h5.id)).toMatchObject(picks([p5], ['id']));
          expect(await getMyPromises(h6.id)).toBeArrayOfSize(0);
          expect(await getMyPromises(hx.id)).toBeArrayOfSize(0);
        } else if (condition.role === PromiseUserRole.ATTENDEE) {
          await expect(getMyPromises(h1.id)).resolves.toMatchObject(picks([p5], ['id']));
          await expect(getMyPromises(h2.id)).resolves.toBeArrayOfSize(0);
          await expect(getMyPromises(h3.id)).resolves.toMatchObject(picks([p2], ['id']));
          await expect(getMyPromises(h4.id)).resolves.toMatchObject(picks([p5], ['id']));
          await expect(getMyPromises(h5.id)).resolves.toBeArrayOfSize(0);
          await expect(getMyPromises(h6.id)).resolves.toBeArrayOfSize(0);
          await expect(getMyPromises(hx.id)).resolves.toBeArrayOfSize(0);
        } else if (condition.role === PromiseUserRole.ALL) {
          await expect(getMyPromises(h1.id)).resolves.toMatchObject(picks([p1, p5], ['id']));
          await expect(getMyPromises(h2.id)).resolves.toMatchObject(picks([p2], ['id']));
          await expect(getMyPromises(h3.id)).resolves.toMatchObject(picks([p2], ['id']));
          await expect(getMyPromises(h4.id)).resolves.toMatchObject(picks([p5], ['id']));
          await expect(getMyPromises(h5.id)).resolves.toMatchObject(picks([p5], ['id']));
          await expect(getMyPromises(h6.id)).resolves.toBeArrayOfSize(0);
          await expect(getMyPromises(hx.id)).resolves.toBeArrayOfSize(0);
        }
      } else if (condition.status === PromiseStatus.UNAVAILABLE) {
        if (condition.role === PromiseUserRole.HOST) {
          await expect(getMyPromises(h1.id)).resolves.toBeArrayOfSize(0);
          await expect(getMyPromises(h2.id)).resolves.toBeArrayOfSize(0);
          await expect(getMyPromises(h3.id)).resolves.toMatchObject(picks([p3], ['id']));
          await expect(getMyPromises(h4.id)).resolves.toMatchObject(picks([p4], ['id']));
          await expect(getMyPromises(h5.id)).resolves.toBeArrayOfSize(0);
          await expect(getMyPromises(h6.id)).resolves.toMatchObject(picks([p6], ['id']));
          await expect(getMyPromises(hx.id)).resolves.toBeArrayOfSize(0);
        } else if (condition.role === PromiseUserRole.ATTENDEE) {
          await expect(getMyPromises(h1.id)).resolves.toMatchObject(picks([p6], ['id']));
          await expect(getMyPromises(h2.id)).resolves.toBeArrayOfSize(0);
          await expect(getMyPromises(h3.id)).resolves.toBeArrayOfSize(0);
          await expect(getMyPromises(h4.id)).resolves.toMatchObject(picks([p6], ['id']));
          await expect(getMyPromises(h5.id)).resolves.toMatchObject(picks([p4], ['id']));
          await expect(getMyPromises(h6.id)).resolves.toBeArrayOfSize(0);
          await expect(getMyPromises(hx.id)).resolves.toBeArrayOfSize(0);
        } else if (condition.role === PromiseUserRole.ALL) {
          await expect(getMyPromises(h1.id)).resolves.toMatchObject(picks([p6], ['id']));
          await expect(getMyPromises(h2.id)).resolves.toBeArrayOfSize(0);
          await expect(getMyPromises(h3.id)).resolves.toMatchObject(picks([p3], ['id']));
          await expect(getMyPromises(h4.id)).resolves.toMatchObject(picks([p4, p6], ['id']));
          await expect(getMyPromises(h5.id)).resolves.toMatchObject(picks([p4], ['id']));
          await expect(getMyPromises(h6.id)).resolves.toMatchObject(picks([p6], ['id']));
          await expect(getMyPromises(hx.id)).resolves.toBeArrayOfSize(0);
        }
      } else if (condition.status === PromiseStatus.ALL) {
        if (condition.role === PromiseUserRole.HOST) {
          await expect(getMyPromises(h1.id)).resolves.toMatchObject(picks([p1], ['id']));
          await expect(getMyPromises(h2.id)).resolves.toMatchObject(picks([p2], ['id']));
          await expect(getMyPromises(h3.id)).resolves.toMatchObject(picks([p3], ['id']));
          await expect(getMyPromises(h4.id)).resolves.toMatchObject(picks([p4], ['id']));
          await expect(getMyPromises(h5.id)).resolves.toMatchObject(picks([p5], ['id']));
          await expect(getMyPromises(h6.id)).resolves.toMatchObject(picks([p6], ['id']));
          await expect(getMyPromises(hx.id)).resolves.toBeArrayOfSize(0);
        } else if (condition.role === PromiseUserRole.ATTENDEE) {
          await expect(getMyPromises(h1.id)).resolves.toMatchObject(picks([p5, p6], ['id']));
          await expect(getMyPromises(h2.id)).resolves.toBeArrayOfSize(0);
          await expect(getMyPromises(h3.id)).resolves.toMatchObject(picks([p2], ['id']));
          await expect(getMyPromises(h4.id)).resolves.toMatchObject(picks([p5, p6], ['id']));
          await expect(getMyPromises(h5.id)).resolves.toMatchObject(picks([p4], ['id']));
          await expect(getMyPromises(h6.id)).resolves.toBeArrayOfSize(0);
          await expect(getMyPromises(hx.id)).resolves.toBeArrayOfSize(0);
        } else if (condition.role === PromiseUserRole.ALL) {
          await expect(getMyPromises(h1.id)).resolves.toMatchObject(picks([p1, p5, p6], ['id']));
          await expect(getMyPromises(h2.id)).resolves.toMatchObject(picks([p2], ['id']));
          await expect(getMyPromises(h3.id)).resolves.toMatchObject(picks([p2, p3], ['id']));
          await expect(getMyPromises(h4.id)).resolves.toMatchObject(picks([p4, p5, p6], ['id']));
          await expect(getMyPromises(h5.id)).resolves.toMatchObject(picks([p4, p5], ['id']));
          await expect(getMyPromises(h6.id)).resolves.toMatchObject(picks([p6], ['id']));
          await expect(getMyPromises(hx.id)).resolves.toBeArrayOfSize(0);
        }
      }
    });

    test('should return an empty list if the user has no promises', async () => {
      await expect(promiseController.getMyPromises({ id: 0 })).resolves.toBeArrayOfSize(0);
    });
  });

  describe(PromiseController.prototype.getPromise, () => {
    test('should return a promise', async () => {
      const { promise } = await fixture.write.promise.output();
      const result = await promiseController.getPromise(promise.id);
      expect(result).toMatchObject(R.pick(promise, ['id']));
    });

    test('should throw an error if the promise is not found', async () => {
      await expect(promiseController.getPromise(0)).rejects.toThrow();
    });

    test('should throw an error when unknown error occurs', async () => {
      await expect(promiseController.getPromise('unknown' as any)).rejects.toThrow();
    });
  });

  describe(PromiseController.prototype.createPromise, () => {
    test('should create a promise', async () => {
      const { host, destination, themes, promise } = await fixture.write.promise.output({
        destination: true,
        themes: 3,
      });
      await prisma.promise.delete({ where: { id: promise.id } });

      const input = {
        ...fixture.input.promise({ hostId: host.id }),
        promisedAt: formatISO(tomorrow),
        themeIds: themes.map((theme) => theme.id),
        destination: {
          ...R.omit(destination, ['id']),
          latitude: 37.1234,
          longitude: 127.5678,
        },
      } satisfies InputCreatePromiseDTO;

      const result = await promiseController.createPromise(host, input);

      expect(result).toMatchObject({
        id: expect.any(Number),
        host: { id: host.id },
        destination: {
          ...R.omit(destination, ['id', 'createdAt', 'updatedAt']),
          latitude: parseFloat(input.destination.latitude.toString()),
          longitude: parseFloat(input.destination.longitude.toString()),
        },
        themes: themes.map((theme) => theme.name),
        attendees: [],
      });
    });
  });

  describe(PromiseController.prototype.updatePromise, () => {
    test('should update a promise', async () => {
      const { host, destination, themes, promise } = await fixture.write.promise.output({
        destination: true,
        themes: 3,
      });

      const updatedThemes = [...themes.slice(0, 2), await fixture.write.theme.output()];
      const input = {
        ...fixture.input.promise({ hostId: host.id }),
        promisedAt: formatISO(tomorrow),
        themeIds: updatedThemes.map((theme) => theme.id),
        destination: {
          ...R.omit(destination, ['id']),
          latitude: 37.1234,
          longitude: 127.5678,
        },
      } satisfies InputUpdatePromiseDTO;

      const result = await promiseController.updatePromise(host, promise.id, input);

      expect(result).toMatchObject({
        ...R.omit(input, ['hostId', 'destinationId', 'themeIds', 'updatedAt']),
        id: promise.id,
        promisedAt: new Date(input.promisedAt),
        destination: {
          ...R.omit(destination, ['id', 'createdAt', 'updatedAt']),
          latitude: parseFloat(input.destination.latitude.toString()),
          longitude: parseFloat(input.destination.longitude.toString()),
        },
        isLatestDestination: true,
        themes: updatedThemes.map((theme) => theme.name),
      });
    });

    test('should throw an error if the promise is not found', async () => {
      await expect(promiseController.updatePromise({ id: 0 }, 0, {} as any)).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
      });
    });

    test('should throw an error if the user is not the host of the promise', async () => {
      const { promise } = await fixture.write.promise.output();
      await expect(promiseController.updatePromise({ id: 0 }, promise.id, {} as any)).rejects.toMatchObject({
        status: HttpStatus.FORBIDDEN,
      });
    });

    test('should throw an error when unknown error occurs', async () => {
      await expect(
        promiseController.updatePromise({ id: 'unknown' as any }, 'unknown' as any, {} as any)
      ).rejects.toMatchObject({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    });
  });

  describe(PromiseController.prototype.attendPromise, () => {
    test('should attend a promise', async () => {
      const { promise } = await fixture.write.promise.output();
      const user = await fixture.write.user.output();
      const result = await promiseController.attendPromise(user, promise.id);

      expect(result).toMatchObject({ id: promise.id });

      await expect(
        prisma.promiseUser.findUniqueOrThrow({
          where: { identifier: { userId: user.id, promiseId: promise.id } },
        })
      ).resolves.toMatchObject({ userId: user.id, promiseId: promise.id });
    });

    test('should throw an error if the promise is not found', async () => {
      const user = await fixture.write.user.output();
      await expect(promiseController.attendPromise(user, 0)).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
      });
    });

    test('should throw an error if the user is already attending the promise', async () => {
      const { promise, attendee } = await fixture.write.promise.output({ attendee: true });
      await expect(promiseController.attendPromise(attendee, promise.id)).rejects.toMatchObject({
        status: HttpStatus.BAD_REQUEST,
      });
    });

    test('should throw an error when unknown error occurs', async () => {
      await expect(promiseController.attendPromise({ id: 'unknown' as any }, 'unknown' as any)).rejects.toMatchObject({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    });
  });

  describe(PromiseController.prototype.leavePromise, () => {
    test('should leave a promise', async () => {
      const { promise, attendee } = await fixture.write.promise.output({ attendee: true });
      const result = await promiseController.leavePromise(attendee, promise.id);

      expect(result).toMatchObject({ id: promise.id });

      await expect(
        prisma.promiseUser.findUniqueOrThrow({
          where: { identifier: { userId: attendee.id, promiseId: promise.id } },
        })
      ).rejects.toThrow();
    });

    test('should throw an error if the promise is not found', async () => {
      const user = await fixture.write.user.output();
      await expect(promiseController.leavePromise(user, 0)).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
      });
    });

    test('should throw an error if the user is not attending the promise', async () => {
      const { promise } = await fixture.write.promise.output();
      const user = await fixture.write.user.output();
      await expect(promiseController.leavePromise(user, promise.id)).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
      });
    });

    test('should throw an error if the user is host of the promise', async () => {
      const { host, promise } = await fixture.write.promise.output();
      await expect(promiseController.leavePromise(host, promise.id)).rejects.toMatchObject({
        status: HttpStatus.BAD_REQUEST,
      });
    });

    test('should throw an error when unknown error occurs', async () => {
      await expect(promiseController.leavePromise({ id: 'unknown' as any }, 'unknown' as any)).rejects.toMatchObject({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    });
  });

  describe(PromiseController.prototype.getStartLocation, () => {
    test('should return a start location', async () => {
      const { promise, attendee, startLocation } = await fixture.write.promise.output({
        attendee: true,
        startLocation: true,
      });
      const result = await promiseController.getStartLocation(attendee, promise.id);

      expect(result).toMatchObject(R.pick(startLocation, ['id']));
    });

    test('should throw an error if the promise is not found', async () => {
      const user = await fixture.write.user.output();
      await expect(promiseController.getStartLocation(user, 0)).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
      });
    });

    test('should throw an error if the start location is not found', async () => {
      const { promise, attendee } = await fixture.write.promise.output({ attendee: true });
      await expect(promiseController.getStartLocation(attendee, promise.id)).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
      });
    });

    test('should throw an error when unknown error occurs', async () => {
      await expect(
        promiseController.getStartLocation({ id: 'unknown' as any }, 'unknown' as any)
      ).rejects.toMatchObject({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    });
  });

  describe(PromiseController.prototype.updateStartLocation, () => {
    test('should update a start location', async () => {
      const { promise, attendee } = await fixture.write.promise.output({ attendee: true, startLocation: true });
      const input = {
        ...fixture.input.location(),
        latitude: 37.1234,
        longitude: 127.5678,
      } satisfies InputLocationDTO;

      const result = await promiseController.updateStartLocation(attendee, promise.id, input);

      expect(result).toMatchObject({
        ...R.omit(input, ['id', 'createdAt', 'updatedAt']),
        latitude: input.latitude,
        longitude: input.longitude,
      });
    });

    test('should throw an error if the promise is not found', async () => {
      const user = await fixture.write.user.output();
      await expect(promiseController.updateStartLocation(user, 0, {} as any)).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
      });
    });

    test('should throw an error when unknown error occurs', async () => {
      await expect(
        promiseController.updateStartLocation({ id: 'unknown' as any }, 'unknown' as any, {} as any)
      ).rejects.toMatchObject({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    });
  });

  describe(PromiseController.prototype.deleteStartLocation, () => {
    test('should delete a start location', async () => {
      const { promise, attendee, startLocation } = await fixture.write.promise.output({
        attendee: true,
        startLocation: true,
      });
      const result = await promiseController.deleteStartLocation(attendee, promise.id);

      expect(result).toMatchObject(R.pick(startLocation, ['id']));
    });

    test('should throw an error if the promise is not found', async () => {
      const user = await fixture.write.user.output();
      await expect(promiseController.deleteStartLocation(user, 0)).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
      });
    });

    test('should throw an error if the start location is not found', async () => {
      const { promise, attendee } = await fixture.write.promise.output({ attendee: true });
      await expect(promiseController.deleteStartLocation(attendee, promise.id)).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
      });
    });

    test('should throw an error when unknown error occurs', async () => {
      await expect(
        promiseController.deleteStartLocation({ id: 'unknown' as any }, 'unknown' as any)
      ).rejects.toMatchObject({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    });
  });

  describe(PromiseController.prototype.getMiddleLocation, () => {
    const randomLatitude = () => Math.random() * 180 - 90; // -90 ~ 90
    const randomLongitude = () => Math.random() * 360 - 180; // -180 ~ 180

    test('should return a middle location calculated from start locations', async () => {
      const { host, promise, attendees } = await fixture.write.promise.output({ attendees: 5 });
      const locations = await Promise.all(
        R.times(5, () =>
          fixture.write.location.output({
            latitude: new Prisma.Decimal(randomLatitude()),
            longitude: new Prisma.Decimal(randomLongitude()),
          })
        )
      );

      await Promise.all(
        locations.map((location, i) =>
          prisma.promiseUser.update({
            where: {
              identifier: {
                userId: attendees[i].id,
                promiseId: promise.id,
              },
            },
            data: { startLocationId: location.id },
          })
        )
      );

      const result = await promiseController.getMiddleLocation(host, promise.id);

      expect(result).toMatchObject({
        latitude: expect.toBeNumber(),
        longitude: expect.toBeNumber(),
      });
    });

    test('should throw an error if the promise is not found', async () => {
      const user = await fixture.write.user.output();
      await expect(promiseController.getMiddleLocation(user, 0)).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
      });
    });

    test('should throw an error if the user does not attend the promise', async () => {
      const { promise } = await fixture.write.promise.output();
      const user = await fixture.write.user.output();
      await expect(promiseController.getMiddleLocation(user, promise.id)).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
      });
    });

    test('should throw an error if the start locations are less than 2', async () => {
      const { promise, attendee } = await fixture.write.promise.output({ attendee: true });
      await expect(promiseController.getMiddleLocation(attendee, promise.id)).rejects.toMatchObject({
        status: HttpStatus.BAD_REQUEST,
      });
    });
  });

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

  describe(PromiseController.prototype.getThemes, () => {
    test('should return a list of themes', async () => {
      const themes = await Promise.all(R.times(3, () => fixture.write.theme.output()));
      const result = await promiseController.getThemes();

      expect(result).toBeArrayOfSize(3);
      expect(result).toMatchObject(themes.map((theme) => R.pick(theme, ['id', 'name'])));
    });

    test('should return an empty list if there are no themes', async () => {
      await expect(promiseController.getThemes()).resolves.toBeArrayOfSize(0);
    });
  });

  const deviceId = 'test-device-id';

  describe(PromiseController.prototype.enqueuePromise, () => {
    mockGlobalFn('setTimeout');

    test('should enqueue a promise id and device id', async () => {
      const { promise } = await fixture.write.promise.output();
      const result = await promiseController.enqueuePromise(promise.id, deviceId);
      expect(result).toBeUndefined();
    });

    test('should throw an error if the promise is not found', async () => {
      await expect(promiseController.enqueuePromise(0, deviceId)).rejects.toThrow();
    });
  });

  describe(PromiseController.prototype.dequeuePromise, () => {
    mockGlobalFn('setTimeout');

    test('should dequeue a promise id by device id', async () => {
      const { promise } = await fixture.write.promise.output();
      await promiseController.enqueuePromise(promise.id, deviceId);
      const result = await promiseController.dequeuePromise(deviceId);
      expect(result).toEqual({ id: promise.id });
    });

    test('should throw an error if the device id is not found', async () => {
      await expect(promiseController.dequeuePromise('unknown')).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
      });
    });

    test('should throw an error if promise not found', async () => {
      const { promise } = await fixture.write.promise.output();
      await promiseController.enqueuePromise(promise.id, deviceId);
      await prisma.promise.update({ where: { id: promise.id }, data: { promisedAt: yesterday } });
      await expect(promiseController.dequeuePromise(deviceId)).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
      });
    });
  });
});
