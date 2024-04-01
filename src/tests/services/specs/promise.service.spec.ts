import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { addDays, formatISO, subDays } from 'date-fns';
import { pick } from 'remeda';

import {
  InputCreatePromiseDTO,
  InputLocationDTO,
  InputUpdatePromiseDTO,
  PromiseStatus,
  PromiseUserRole,
} from '@/modules/promise/promise.dto';
import { PromiseService, PromiseServiceError } from '@/modules/promise/promise.service';
import { DestinationType, LocationShareType } from '@/prisma/prisma.entity';
import { PrismaService } from '@/prisma/prisma.service';
import {
  createLocationBuilder,
  createPromiseBuilder,
  createPromiseUserBuilder,
  createUserBuilder,
} from '@/tests/fixtures/builder';
import { createPrismaClient } from '@/tests/prisma';

const createUser = createUserBuilder(3e5);
const createLocation = createLocationBuilder(1e5);
const createPromise = createPromiseBuilder(1e5);
const createPromiseUser = createPromiseUserBuilder(1e5);

describe(PromiseService, () => {
  let promiseService: PromiseService;
  const prisma = createPrismaClient({ logging: false });

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [PromiseService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    promiseService = module.get(PromiseService);
  });

  test('should be defined', () => {
    expect(promiseService).toBeInstanceOf(PromiseService);
  });

  describe(PromiseService.prototype.exists, () => {
    test('should return true if the promise exists', async () => {
      const host = await prisma.user.create({ data: createUser() });
      const destination = await prisma.location.create({ data: createLocation() });
      const promise = await prisma.promise.create({
        data: createPromise({ hostId: host.id, destinationId: destination.id }),
      });

      await expect(promiseService.exists({ id: promise.id })).resolves.toBe(true);
    });

    test('should return false if the promise does not exist', async () => {
      await expect(promiseService.exists({ id: -1 })).resolves.toBe(false);
    });

    test.each([
      [PromiseStatus.ALL, true],
      [PromiseStatus.AVAILABLE, true],
      [PromiseStatus.UNAVAILABLE, false],
    ])(
      'should return true if the promise exists by filtering with the status (Available)',
      async (status, expected) => {
        const host = await prisma.user.create({ data: createUser() });
        const destination = await prisma.location.create({ data: createLocation() });
        const promise = await prisma.promise.create({
          data: createPromise({
            hostId: host.id,
            destinationId: destination.id,
            promisedAt: addDays(new Date(), 1),
          }),
        });

        await expect(promiseService.exists({ id: promise.id, status })).resolves.toBe(expected);
      }
    );

    test.each([
      [PromiseStatus.ALL, true],
      [PromiseStatus.AVAILABLE, false],
      [PromiseStatus.UNAVAILABLE, true],
    ])('should return true if the promise exists by filtering with the status (Overdue)', async (status, expected) => {
      const host = await prisma.user.create({ data: createUser() });
      const destination = await prisma.location.create({ data: createLocation() });
      const promise = await prisma.promise.create({
        data: createPromise({
          hostId: host.id,
          destinationId: destination.id,
          promisedAt: subDays(new Date(), 1),
        }),
      });

      await expect(promiseService.exists({ id: promise.id, status })).resolves.toBe(expected);
    });

    test.each([
      [PromiseStatus.ALL, true],
      [PromiseStatus.AVAILABLE, false],
      [PromiseStatus.UNAVAILABLE, true],
    ])(
      'should return true if the promise exists by filtering with the status (Completed)',
      async (status, expected) => {
        const host = await prisma.user.create({ data: createUser() });
        const destination = await prisma.location.create({ data: createLocation() });
        const promise = await prisma.promise.create({
          data: createPromise({ hostId: host.id, destinationId: destination.id, completedAt: new Date() }),
        });

        await expect(promiseService.exists({ id: promise.id, status })).resolves.toBe(expected);
      }
    );

    test.each([
      [PromiseUserRole.HOST, true],
      [PromiseUserRole.ATTENDEE, false],
      [PromiseUserRole.ALL, true],
    ])('should return false if the promise exists by filtering with the role (Host)', async (role, expected) => {
      const host = await prisma.user.create({ data: createUser() });
      const destination = await prisma.location.create({ data: createLocation() });
      const promise = await prisma.promise.create({
        data: createPromise({ hostId: host.id, destinationId: destination.id }),
      });

      await expect(promiseService.exists({ id: promise.id, role, userId: host.id })).resolves.toBe(expected);
    });

    test.each([
      [PromiseUserRole.HOST, false],
      [PromiseUserRole.ATTENDEE, true],
      [PromiseUserRole.ALL, true],
    ])('should return false if the promise exists by filtering with the role (Attendee)', async (role, expected) => {
      const host = await prisma.user.create({ data: createUser() });
      const attendee = await prisma.user.create({ data: createUser() });
      const destination = await prisma.location.create({ data: createLocation() });
      const promise = await prisma.promise.create({
        data: {
          ...createPromise({ hostId: host.id, destinationId: destination.id }),
          users: { create: { userId: attendee.id } },
        },
      });

      await expect(promiseService.exists({ id: promise.id, role, userId: attendee.id })).resolves.toBe(expected);
    });

    test.each([
      [PromiseStatus.AVAILABLE, PromiseUserRole.HOST, true],
      [PromiseStatus.AVAILABLE, PromiseUserRole.ATTENDEE, false],
      [PromiseStatus.AVAILABLE, PromiseUserRole.ALL, true],
    ])(
      'should return false if the promise exists by filtering with the status (Available) and role (Host)',
      async (status, role, expected) => {
        const host = await prisma.user.create({ data: createUser() });
        const destination = await prisma.location.create({ data: createLocation() });
        const promise = await prisma.promise.create({
          data: createPromise({
            hostId: host.id,
            destinationId: destination.id,
            promisedAt: addDays(new Date(), 1),
          }),
        });

        await expect(promiseService.exists({ id: promise.id, status, role, userId: host.id })).resolves.toBe(expected);
      }
    );

    test.each([
      [PromiseStatus.AVAILABLE, PromiseUserRole.HOST, false],
      [PromiseStatus.AVAILABLE, PromiseUserRole.ATTENDEE, true],
      [PromiseStatus.AVAILABLE, PromiseUserRole.ALL, true],
    ])(
      'should return false if the promise exists by filtering with the status (Available) and role (Attendee)',
      async (status, role, expected) => {
        const host = await prisma.user.create({ data: createUser() });
        const attendee = await prisma.user.create({ data: createUser() });
        const destination = await prisma.location.create({ data: createLocation() });
        const promise = await prisma.promise.create({
          data: {
            ...createPromise({
              hostId: host.id,
              destinationId: destination.id,
              promisedAt: addDays(new Date(), 1),
            }),
            users: { create: { userId: attendee.id } },
          },
        });

        await expect(promiseService.exists({ id: promise.id, status, role, userId: attendee.id })).resolves.toBe(
          expected
        );
      }
    );

    test.each([
      [PromiseStatus.UNAVAILABLE, PromiseUserRole.HOST, true],
      [PromiseStatus.UNAVAILABLE, PromiseUserRole.ATTENDEE, false],
      [PromiseStatus.UNAVAILABLE, PromiseUserRole.ALL, true],
    ])(
      'should return false if the promise exists by filtering with the status (Unavailable) and role (Host)',
      async (status, role, expected) => {
        const host = await prisma.user.create({ data: createUser() });
        const destination = await prisma.location.create({ data: createLocation() });
        const promise = await prisma.promise.create({
          data: createPromise({
            hostId: host.id,
            destinationId: destination.id,
            promisedAt: subDays(new Date(), 1),
          }),
        });

        await expect(promiseService.exists({ id: promise.id, status, role, userId: host.id })).resolves.toBe(expected);
      }
    );

    test.each([
      [PromiseStatus.UNAVAILABLE, PromiseUserRole.HOST, false],
      [PromiseStatus.UNAVAILABLE, PromiseUserRole.ATTENDEE, true],
      [PromiseStatus.UNAVAILABLE, PromiseUserRole.ALL, true],
    ])(
      'should return false if the promise exists by filtering with the status (Unavailable) and role (Attendee)',
      async (status, role, expected) => {
        const host = await prisma.user.create({ data: createUser() });
        const attendee = await prisma.user.create({ data: createUser() });
        const destination = await prisma.location.create({ data: createLocation() });
        const promise = await prisma.promise.create({
          data: {
            ...createPromise({
              hostId: host.id,
              destinationId: destination.id,
              promisedAt: subDays(new Date(), 1),
            }),
            users: { create: { userId: attendee.id } },
          },
        });

        await expect(promiseService.exists({ id: promise.id, status, role, userId: attendee.id })).resolves.toBe(
          expected
        );
      }
    );

    test.each([
      [PromiseStatus.ALL, PromiseUserRole.HOST, true],
      [PromiseStatus.ALL, PromiseUserRole.ATTENDEE, false],
      [PromiseStatus.ALL, PromiseUserRole.ALL, true],
    ])(
      'should return true if the promise exists by filtering with the status (All) and role (Host)',
      async (status, role, expected) => {
        const host = await prisma.user.create({ data: createUser() });
        const destination = await prisma.location.create({ data: createLocation() });
        const promise = await prisma.promise.create({
          data: createPromise({ hostId: host.id, destinationId: destination.id }),
        });

        await expect(
          promiseService.exists({
            id: promise.id,
            status,
            role,
            userId: host.id,
          })
        ).resolves.toBe(expected);
      }
    );

    test.each([
      [PromiseStatus.ALL, PromiseUserRole.HOST, false],
      [PromiseStatus.ALL, PromiseUserRole.ATTENDEE, true],
      [PromiseStatus.ALL, PromiseUserRole.ALL, true],
    ])(
      'should return true if the promise exists by filtering with the status (All) and role (Attendee)',
      async (status, role, expected) => {
        const host = await prisma.user.create({ data: createUser() });
        const attendee = await prisma.user.create({ data: createUser() });
        const destination = await prisma.location.create({ data: createLocation() });
        const promise = await prisma.promise.create({
          data: {
            ...createPromise({ hostId: host.id, destinationId: destination.id }),
            users: { create: { userId: attendee.id } },
          },
        });

        await expect(promiseService.exists({ id: promise.id, status, role, userId: attendee.id })).resolves.toBe(
          expected
        );
      }
    );
  });

  describe(PromiseService.prototype.findAll, () => {
    test('should return promises by the user', async () => {
      const host = await prisma.user.create({
        data: createUser(),
        select: { id: true, username: true, profileUrl: true },
      });
      const attendee = await prisma.user.create({
        data: createUser(),
        select: { id: true, username: true, profileUrl: true },
      });
      const destination = await prisma.location.create({ data: createLocation() });
      const promise = await prisma.promise.create({
        data: {
          ...createPromise({ hostId: host.id, destinationId: destination.id }),
          users: { create: { userId: attendee.id } },
        },
      });

      await expect(promiseService.findAll({ role: PromiseUserRole.ALL, userId: host.id })).resolves.toMatchObject([
        {
          ...promise,
          host,
          users: [{ user: attendee }],
          destination,
        },
      ]);
    });

    test('should return empty array if the user does not have any promises', async () => {
      await expect(promiseService.findAll({ role: PromiseUserRole.ALL, userId: -1 })).resolves.toEqual([]);
    });

    test.each([
      [PromiseUserRole.HOST, true],
      [PromiseUserRole.ATTENDEE, false],
      [PromiseUserRole.ALL, true],
    ])('should return promises by the user with the role (Host)', async (role, expected) => {
      const host = await prisma.user.create({
        data: createUser(),
        select: { id: true, username: true, profileUrl: true },
      });
      const attendee = await prisma.user.create({
        data: createUser(),
        select: { id: true, username: true, profileUrl: true },
      });
      const destination = await prisma.location.create({ data: createLocation() });
      const promise = await prisma.promise.create({
        data: {
          ...createPromise({ hostId: host.id, destinationId: destination.id }),
          users: { create: { userId: attendee.id } },
        },
      });

      await expect(promiseService.findAll({ role, userId: host.id })).resolves.toMatchObject(
        expected
          ? [
              {
                ...promise,
                host,
                users: [{ user: attendee }],
                destination,
              },
            ]
          : []
      );
    });

    test.each([
      [PromiseUserRole.HOST, false],
      [PromiseUserRole.ATTENDEE, true],
      [PromiseUserRole.ALL, true],
    ])('should return promises by the user with the role (Attendee)', async (role, expected) => {
      const host = await prisma.user.create({
        data: createUser(),
        select: { id: true, username: true, profileUrl: true },
      });
      const attendee = await prisma.user.create({
        data: createUser(),
        select: { id: true, username: true, profileUrl: true },
      });
      const destination = await prisma.location.create({ data: createLocation() });
      const promise = await prisma.promise.create({
        data: {
          ...createPromise({ hostId: host.id, destinationId: destination.id }),
          users: { create: { userId: attendee.id } },
        },
      });

      await expect(promiseService.findAll({ role, userId: attendee.id })).resolves.toMatchObject(
        expected
          ? [
              {
                ...promise,
                host,
                users: [{ user: attendee }],
                destination,
              },
            ]
          : []
      );
    });

    test.each([
      [PromiseStatus.AVAILABLE, PromiseUserRole.HOST, true],
      [PromiseStatus.AVAILABLE, PromiseUserRole.ATTENDEE, false],
      [PromiseStatus.AVAILABLE, PromiseUserRole.ALL, true],
    ])(
      'should return promises by the user with the status (Available) and role (Host)',
      async (status, role, expected) => {
        const host = await prisma.user.create({
          data: createUser(),
          select: { id: true, username: true, profileUrl: true },
        });
        const attendee = await prisma.user.create({
          data: createUser(),
          select: { id: true, username: true, profileUrl: true },
        });
        const destination = await prisma.location.create({ data: createLocation() });
        const promise = await prisma.promise.create({
          data: {
            ...createPromise({
              hostId: host.id,
              destinationId: destination.id,
              promisedAt: addDays(new Date(), 1),
            }),
            users: { create: { userId: attendee.id } },
          },
        });

        await expect(promiseService.findAll({ role, userId: host.id, status })).resolves.toMatchObject(
          expected
            ? [
                {
                  ...promise,
                  host,
                  users: [{ user: attendee }],
                  destination,
                },
              ]
            : []
        );
      }
    );

    test.each([
      [PromiseStatus.AVAILABLE, PromiseUserRole.HOST, false],
      [PromiseStatus.AVAILABLE, PromiseUserRole.ATTENDEE, true],
      [PromiseStatus.AVAILABLE, PromiseUserRole.ALL, true],
    ])(
      'should return promises by the user with the status (Available) and role (Attendee)',
      async (status, role, expected) => {
        const host = await prisma.user.create({
          data: createUser(),
          select: { id: true, username: true, profileUrl: true },
        });
        const attendee = await prisma.user.create({
          data: createUser(),
          select: { id: true, username: true, profileUrl: true },
        });
        const destination = await prisma.location.create({ data: createLocation() });
        const promise = await prisma.promise.create({
          data: {
            ...createPromise({
              hostId: host.id,
              destinationId: destination.id,
              promisedAt: addDays(new Date(), 1),
            }),
            users: { create: { userId: attendee.id } },
          },
        });

        await expect(promiseService.findAll({ role, userId: attendee.id, status })).resolves.toMatchObject(
          expected
            ? [
                {
                  ...promise,
                  host,
                  users: [{ user: attendee }],
                  destination,
                },
              ]
            : []
        );
      }
    );

    test.each([
      [PromiseStatus.UNAVAILABLE, PromiseUserRole.HOST, true],
      [PromiseStatus.UNAVAILABLE, PromiseUserRole.ATTENDEE, false],
      [PromiseStatus.UNAVAILABLE, PromiseUserRole.ALL, true],
    ])(
      'should return promises by the user with the status (Unavailable) and role (Host)',
      async (status, role, expected) => {
        await prisma.promise.deleteMany();

        const host = await prisma.user.create({
          data: createUser(),
          select: { id: true, username: true, profileUrl: true },
        });
        const attendee = await prisma.user.create({
          data: createUser(),
          select: { id: true, username: true, profileUrl: true },
        });
        const destination = await prisma.location.create({ data: createLocation() });
        const promise = await prisma.promise.create({
          data: {
            ...createPromise({
              hostId: host.id,
              destinationId: destination.id,
              promisedAt: subDays(new Date(), 1),
            }),
            users: { create: { userId: attendee.id } },
          },
        });

        const result = await promiseService.findAll({ role, userId: host.id, status });

        if (expected) {
          expect(result).toMatchObject([{ id: promise.id }]);
        } else {
          expect(result).toEqual([]);
        }
      }
    );

    test.each([
      [PromiseStatus.UNAVAILABLE, PromiseUserRole.HOST, false],
      [PromiseStatus.UNAVAILABLE, PromiseUserRole.ATTENDEE, true],
      [PromiseStatus.UNAVAILABLE, PromiseUserRole.ALL, true],
    ])(
      'should return promises by the user with the status (Unavailable) and role (Attendee)',
      async (status, role, expected) => {
        await prisma.promise.deleteMany();

        const host = await prisma.user.create({
          data: createUser(),
          select: { id: true, username: true, profileUrl: true },
        });
        const attendee = await prisma.user.create({
          data: createUser(),
          select: { id: true, username: true, profileUrl: true },
        });
        const destination = await prisma.location.create({ data: createLocation() });
        const promise = await prisma.promise.create({
          data: {
            ...createPromise({
              hostId: host.id,
              destinationId: destination.id,
              promisedAt: subDays(new Date(), 1),
            }),
            users: { create: { userId: attendee.id } },
          },
        });

        await expect(promiseService.findAll({ role, userId: attendee.id, status })).resolves.toMatchObject(
          expected
            ? [
                {
                  ...promise,
                  host,
                  users: [{ user: attendee }],
                  destination,
                },
              ]
            : []
        );
      }
    );
  });

  describe(PromiseService.prototype.findOne, () => {
    test('should return a promise by the id', async () => {
      const host = await prisma.user.create({ data: createUser() });
      const destination = await prisma.location.create({ data: createLocation() });
      const promise = await prisma.promise.create({
        data: createPromise({ hostId: host.id, destinationId: destination.id }),
      });

      await expect(promiseService.findOne({ id: promise.id })).resolves.toMatchObject(promise);
    });

    test('should throw an error if the promise does not exist', async () => {
      await expect(promiseService.findOne({ id: -1 })).rejects.toEqual(PromiseServiceError.NotFoundPromise);
    });
  });

  describe(PromiseService.prototype.create, () => {
    test('should create a promise', async () => {
      const host = await prisma.user.create({ data: createUser() });
      const destination = await prisma.location.create({ data: createLocation() });
      const inputPromise = createPromise({ hostId: host.id });

      const promise = {
        ...pick(inputPromise, [
          'title',
          'promisedAt',
          'destinationType',
          'locationShareStartType',
          'locationShareStartValue',
          'locationShareEndType',
          'locationShareEndValue',
        ]),
        promisedAt: formatISO(inputPromise.promisedAt),
        themeIds: [1, 2, 3],
        destination: {
          ...pick(destination, ['city', 'district', 'address']),
          latitude: parseFloat(destination.latitude.toString()),
          longitude: parseFloat(destination.longitude.toString()),
        },
      } satisfies InputCreatePromiseDTO;

      await expect(promiseService.create(host.id, promise)).resolves.toMatchObject({
        ...pick(promise, [
          'title',
          'promisedAt',
          'destinationType',
          'locationShareStartType',
          'locationShareStartValue',
          'locationShareEndType',
          'locationShareEndValue',
        ]),
        promisedAt: new Date(promise.promisedAt),
        completedAt: null,
        host: pick(host, ['id', 'username', 'profileUrl']),
        hostId: host.id,
        users: [{ user: host }],
        themes: expect.arrayContaining([
          { theme: { id: 1, name: expect.any(String) } },
          { theme: { id: 2, name: expect.any(String) } },
          { theme: { id: 3, name: expect.any(String) } },
        ]),
        destination: {
          ...promise.destination,
          latitude: destination.latitude,
          longitude: destination.longitude,
        },
      });
    });
  });

  describe(PromiseService.prototype.update, () => {
    test('should update a promise', async () => {
      const host = await prisma.user.create({ data: createUser() });
      const destination = await prisma.location.create({ data: createLocation() });
      const promise = await prisma.promise.create({
        data: {
          ...createPromise({ hostId: host.id, destinationId: destination.id }),
          themes: { create: [{ themeId: 1 }, { themeId: 2 }, { themeId: 3 }] },
          users: { create: { userId: host.id } },
        },
      });
      const inputPromise = createPromise({ hostId: host.id });

      const updatedPromise = {
        title: 'updated title',
        themeIds: [3, 4, 5],
        promisedAt: formatISO(inputPromise.promisedAt),
        destinationType: DestinationType.DYNAMIC,
        locationShareStartType: LocationShareType.DISTANCE,
        locationShareStartValue: 100,
        locationShareEndType: LocationShareType.TIME,
        locationShareEndValue: 60,
        destination: {
          city: 'updated city',
          district: 'updated district',
          address: 'updated address',
          latitude: 37.0,
          longitude: 127.0,
        },
      } satisfies InputUpdatePromiseDTO;

      await expect(promiseService.update(promise.id, host.id, updatedPromise)).resolves.toMatchObject({
        ...pick(updatedPromise, [
          'title',
          'promisedAt',
          'destinationType',
          'locationShareStartType',
          'locationShareStartValue',
          'locationShareEndType',
          'locationShareEndValue',
          'destination',
        ]),
        promisedAt: new Date(updatedPromise.promisedAt),
        completedAt: null,
        host: pick(host, ['id', 'username', 'profileUrl']),
        hostId: host.id,
        users: [{ user: host }],
        themes: expect.arrayContaining([
          { theme: { id: 3, name: expect.any(String) } },
          { theme: { id: 4, name: expect.any(String) } },
          { theme: { id: 5, name: expect.any(String) } },
        ]),
        destination: {
          ...updatedPromise.destination,
          latitude: new Prisma.Decimal(updatedPromise.destination.latitude),
          longitude: new Prisma.Decimal(updatedPromise.destination.longitude),
        },
      });
    });

    test('should throw an error if the attendees try to update the promise', async () => {
      const host = await prisma.user.create({ data: createUser() });
      const destination = await prisma.location.create({ data: createLocation() });
      const promise = await prisma.promise.create({
        data: createPromise({ hostId: host.id, destinationId: destination.id }),
      });

      await expect(promiseService.update(promise.id, -1, {} as any)).rejects.toEqual(
        PromiseServiceError.OnlyHostUpdatable
      );
    });

    test('should throw an error if the promise does not exist', async () => {
      await expect(promiseService.update(0, 0, {} as any)).rejects.toEqual(PromiseServiceError.NotFoundPromise);
    });
  });

  describe(PromiseService.prototype.getStartLocation, () => {
    test('should return a start location by the promise id', async () => {
      const host = await prisma.user.create({ data: createUser() });
      const destination = await prisma.location.create({ data: createLocation() });
      const startLocation = await prisma.location.create({ data: createLocation() });
      const promise = await prisma.promise.create({
        data: {
          ...createPromise({ hostId: host.id, destinationId: destination.id }),
          users: { create: { userId: host.id, startLocationId: startLocation.id } },
        },
      });
      await expect(promiseService.getStartLocation(promise.id, host.id)).resolves.toMatchObject(startLocation);

      const attendee = await prisma.user.create({ data: createUser() });
      const attendeeStartLocation = await prisma.location.create({ data: createLocation() });
      await prisma.promiseUser.create({
        data: createPromiseUser({
          promiseId: promise.id,
          userId: attendee.id,
          startLocationId: attendeeStartLocation.id,
        }),
      });
      await expect(promiseService.getStartLocation(promise.id, attendee.id)).resolves.toMatchObject(
        attendeeStartLocation
      );
    });

    test('should throw an error if the promise does not exist', async () => {
      await expect(promiseService.getStartLocation(0, 0)).rejects.toEqual(PromiseServiceError.NotFoundPromise);
    });

    test('should throw an error if the user is not attending the promise', async () => {
      const host = await prisma.user.create({ data: createUser() });
      const destination = await prisma.location.create({ data: createLocation() });
      const promise = await prisma.promise.create({
        data: {
          ...createPromise({ hostId: host.id, destinationId: destination.id }),
          users: { create: { userId: host.id } },
        },
      });

      await expect(promiseService.getStartLocation(promise.id, -1)).rejects.toEqual(
        PromiseServiceError.NotFoundPromise
      );
    });

    test('should throw an error if the user does not have a start location', async () => {
      const host = await prisma.user.create({ data: createUser() });
      const destination = await prisma.location.create({ data: createLocation() });
      const promise = await prisma.promise.create({
        data: {
          ...createPromise({ hostId: host.id, destinationId: destination.id }),
          users: { create: { userId: host.id } },
        },
      });

      await expect(promiseService.getStartLocation(promise.id, host.id)).rejects.toEqual(
        PromiseServiceError.NotFoundStartLocation
      );
    });
  });

  describe(PromiseService.prototype.updateStartLocation, () => {
    test('should update a start location by the promise id', async () => {
      const host = await prisma.user.create({ data: createUser() });
      const destination = await prisma.location.create({ data: createLocation() });
      const startLocation = await prisma.location.create({ data: createLocation() });
      const promise = await prisma.promise.create({
        data: {
          ...createPromise({ hostId: host.id, destinationId: destination.id }),
          users: { create: { userId: host.id, startLocationId: startLocation.id } },
        },
      });
      const updatedStartLocation = {
        city: 'updated city',
        district: 'updated district',
        address: 'updated address',
        latitude: 37.0,
        longitude: 127.0,
      } satisfies InputLocationDTO;

      await expect(
        promiseService.updateStartLocation(promise.id, host.id, updatedStartLocation)
      ).resolves.toMatchObject({
        ...updatedStartLocation,
        latitude: new Prisma.Decimal(updatedStartLocation.latitude),
        longitude: new Prisma.Decimal(updatedStartLocation.longitude),
      });
    });

    test('should throw an error if the promise does not exist', async () => {
      await expect(promiseService.updateStartLocation(0, 0, {} as any)).rejects.toEqual(
        PromiseServiceError.NotFoundPromise
      );
    });

    test('should throw an error if the user is not attending the promise', async () => {
      const host = await prisma.user.create({ data: createUser() });
      const destination = await prisma.location.create({ data: createLocation() });
      const promise = await prisma.promise.create({
        data: {
          ...createPromise({ hostId: host.id, destinationId: destination.id }),
          users: { create: { userId: host.id } },
        },
      });

      await expect(promiseService.updateStartLocation(promise.id, -1, {} as any)).rejects.toEqual(
        PromiseServiceError.NotFoundPromise
      );
    });
  });

  describe(PromiseService.prototype.deleteStartLocation, () => {
    test('should delete a start location by the promise id', async () => {
      const host = await prisma.user.create({ data: createUser() });
      const destination = await prisma.location.create({ data: createLocation() });
      const startLocation = await prisma.location.create({ data: createLocation() });
      const promise = await prisma.promise.create({
        data: {
          ...createPromise({ hostId: host.id, destinationId: destination.id }),
          users: { create: { userId: host.id, startLocationId: startLocation.id } },
        },
      });

      await expect(promiseService.deleteStartLocation(promise.id, host.id)).resolves.toBeUndefined();
      await expect(promiseService.getStartLocation(promise.id, host.id)).rejects.toEqual(
        PromiseServiceError.NotFoundStartLocation
      );
    });

    test('should throw an error if the promise does not exist', async () => {
      await expect(promiseService.deleteStartLocation(0, 0)).rejects.toEqual(PromiseServiceError.NotFoundPromise);
    });
  });

  describe(PromiseService.prototype.attend, () => {
    test('should attend a promise by the user', async () => {
      const host = await prisma.user.create({ data: createUser() });
      const attendee = await prisma.user.create({ data: createUser() });
      const destination = await prisma.location.create({ data: createLocation() });
      const promise = await prisma.promise.create({
        data: {
          ...createPromise({ hostId: host.id, destinationId: destination.id }),
          users: { create: { userId: host.id } },
        },
      });

      await expect(promiseService.attend(promise.id, attendee.id)).resolves.toMatchObject({
        id: promise.id,
      });
      await expect(promiseService.findOne({ id: promise.id })).resolves.toMatchObject({
        ...promise,
        users: [{ user: host }, { user: attendee }],
      });
    });

    test('should throw an error if the promise does not exist', async () => {
      await expect(promiseService.attend(0, 0)).rejects.toEqual(PromiseServiceError.NotFoundPromise);
    });

    test('should throw an error if the user is already attending the promise', async () => {
      const host = await prisma.user.create({ data: createUser() });
      const attendee = await prisma.user.create({ data: createUser() });
      const destination = await prisma.location.create({ data: createLocation() });
      const promise = await prisma.promise.create({
        data: {
          ...createPromise({ hostId: host.id, destinationId: destination.id }),
          users: { create: [{ userId: host.id }, { userId: attendee.id }] },
        },
      });

      await expect(promiseService.attend(promise.id, attendee.id)).rejects.toEqual(PromiseServiceError.AlreadyAttended);
    });

    test('should throw an error when occurred an unexpected error', async () => {
      await expect(promiseService.attend('unknown' as any, 'unknown' as any)).rejects.toThrow();
    });
  });

  describe(PromiseService.prototype.leave, () => {
    test('should leave a promise by the user', async () => {
      const host = await prisma.user.create({ data: createUser() });
      const attendee = await prisma.user.create({ data: createUser() });
      const destination = await prisma.location.create({ data: createLocation() });
      const promise = await prisma.promise.create({
        data: {
          ...createPromise({ hostId: host.id, destinationId: destination.id }),
          users: { create: [{ userId: host.id }, { userId: attendee.id }] },
        },
      });

      await expect(promiseService.leave(promise.id, attendee.id)).resolves.toBeUndefined();
      await expect(promiseService.findOne({ id: promise.id })).resolves.toMatchObject({
        ...promise,
        users: [{ user: host }],
      });
    });

    test('should throw an error if the promise does not exist', async () => {
      await expect(promiseService.leave(0, 0)).rejects.toEqual(PromiseServiceError.NotFoundPromise);
    });

    test('should throw an error if the user is not attending the promise', async () => {
      const host = await prisma.user.create({ data: createUser() });
      const attendee = await prisma.user.create({ data: createUser() });
      const destination = await prisma.location.create({ data: createLocation() });
      const promise = await prisma.promise.create({
        data: {
          ...createPromise({ hostId: host.id, destinationId: destination.id }),
          users: { create: { userId: host.id } },
        },
      });

      await expect(promiseService.leave(promise.id, attendee.id)).rejects.toEqual(PromiseServiceError.NotFoundPromise);
    });

    test('should throw an error if the user is the host of the promise', async () => {
      const host = await prisma.user.create({ data: createUser() });
      const destination = await prisma.location.create({ data: createLocation() });
      const promise = await prisma.promise.create({
        data: {
          ...createPromise({ hostId: host.id, destinationId: destination.id }),
          users: { create: { userId: host.id } },
        },
      });

      await expect(promiseService.leave(promise.id, host.id)).rejects.toEqual(PromiseServiceError.HostCannotLeave);
    });

    test('should throw an error when occurred an unexpected error', async () => {
      await expect(promiseService.leave('unknown' as any, 'unknown' as any)).rejects.toThrow();
    });
  });

  describe(PromiseService.prototype.getAttendees, () => {
    test('should return attendees by the promise id', async () => {
      const host = await prisma.user.create({ data: createUser() });
      const attendee = await prisma.user.create({ data: createUser() });
      const destination = await prisma.location.create({ data: createLocation() });
      const promise = await prisma.promise.create({
        data: {
          ...createPromise({ hostId: host.id, destinationId: destination.id }),
          users: { create: [{ userId: host.id }, { userId: attendee.id }] },
        },
      });

      const result = await promiseService.getAttendees(promise.id);
      expect(result).toHaveLength(2);
      expect(result).toMatchObject([{ userId: host.id }, { userId: attendee.id }]);
    });

    test('should return attendees by the promise id and the user ids', async () => {
      const host = await prisma.user.create({ data: createUser() });
      const attendee = await prisma.user.create({ data: createUser() });
      const anotherAttendee = await prisma.user.create({ data: createUser() });
      const destination = await prisma.location.create({ data: createLocation() });
      const promise = await prisma.promise.create({
        data: {
          ...createPromise({ hostId: host.id, destinationId: destination.id }),
          users: { create: [{ userId: host.id }, { userId: attendee.id }, { userId: anotherAttendee.id }] },
        },
      });

      const result = await promiseService.getAttendees(promise.id, [attendee.id, anotherAttendee.id]);
      expect(result).toHaveLength(2);
      expect(result).toMatchObject([{ userId: attendee.id }, { userId: anotherAttendee.id }]);
    });
  });

  describe(PromiseService.prototype.getThemes, () => {
    test('should return themes by the promise id', async () => {
      expect(await promiseService.getThemes()).toEqual(expect.arrayContaining([{ id: 1, name: expect.any(String) }]));
    });
  });
});
