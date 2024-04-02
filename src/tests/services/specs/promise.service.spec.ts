import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { addDays, formatISO, subDays } from 'date-fns';
import * as R from 'remeda';

import {
  InputCreatePromiseDTO,
  InputLocationDTO,
  InputUpdatePromiseDTO,
  PromiseStatus,
  PromiseUserRole,
} from '@/modules/promise/promise.dto';
import { PromiseService, PromiseServiceError } from '@/modules/promise/promise.service';
import { DestinationType } from '@/prisma/prisma.entity';
import { PrismaService } from '@/prisma/prisma.service';
import {
  createLocationBuilder,
  createPromiseBuilder,
  createThemeBuilder,
  createUserBuilder,
} from '@/tests/fixtures/builder';
import { createPrismaClient } from '@/tests/prisma';

const createUser = createUserBuilder(3e5);
const createLocation = createLocationBuilder(3e5);
const createPromise = createPromiseBuilder(3e5);
const createTheme = createThemeBuilder(3e5);

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

  async function fixture() {
    const host = await createUser((user) => prisma.user.create({ data: user }));
    const destination = await createLocation((location) => prisma.location.create({ data: location }));
    const startLocations = await Promise.all(
      R.times(3, () => createLocation((location) => prisma.location.create({ data: location })))
    );
    const attendees = await Promise.all(R.times(3, () => createUser((user) => prisma.user.create({ data: user }))));
    const themes = await Promise.all(R.times(3, () => createTheme((theme) => prisma.theme.create({ data: theme }))));

    const promise = await createPromise({ hostId: host.input.id }, (promise) =>
      prisma.promise.create({
        data: {
          ...promise,
          destinationId: destination?.output.id ?? null,
          themes: { createMany: { data: themes.map((theme) => ({ themeId: theme.output.id })) } },
          users: {
            createMany: {
              data: [host, ...attendees].map((user, i) => ({
                userId: user.output.id,
                startLocationId: i === 0 ? null : startLocations[i - 1]?.output.id ?? null,
              })),
            },
          },
        },
      })
    );

    return {
      host,
      destination,
      startLocations,
      attendees,
      themes,
      promise,
    };
  }
  async function fixtures(number: number, foreignKey?: { hostId: number }) {
    const fs = await Promise.all(R.times(Math.max(1, number), () => fixture()));
    await prisma.promise.updateMany({
      where: { id: { in: fs.map((f) => f.promise.output.id) } },
      data: { hostId: foreignKey?.hostId },
    });
    foreignKey?.hostId && fs.forEach((f) => (f.host.input.id = foreignKey.hostId));
    foreignKey?.hostId && fs.forEach((f) => (f.host.output.id = foreignKey.hostId));
    return fs;
  }

  describe(PromiseService.prototype.exists, () => {
    test('should return true if the promise exists', async () => {
      const { promise } = await fixture();
      await expect(promiseService.exists({ id: promise.input.id })).resolves.toBe(true);
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
        const { promise } = await fixture();
        await prisma.promise.update({ where: { id: promise.input.id }, data: { promisedAt: addDays(new Date(), 1) } });
        await expect(promiseService.exists({ id: promise.input.id, status })).resolves.toBe(expected);
      }
    );

    test.each([
      [PromiseStatus.ALL, true],
      [PromiseStatus.AVAILABLE, false],
      [PromiseStatus.UNAVAILABLE, true],
    ])('should return true if the promise exists by filtering with the status (Overdue)', async (status, expected) => {
      const { promise } = await fixture();
      await prisma.promise.update({ where: { id: promise.output.id }, data: { promisedAt: subDays(new Date(), 1) } });
      await expect(promiseService.exists({ id: promise.input.id, status })).resolves.toBe(expected);
    });

    test.each([
      [PromiseStatus.ALL, true],
      [PromiseStatus.AVAILABLE, false],
      [PromiseStatus.UNAVAILABLE, true],
    ])(
      'should return true if the promise exists by filtering with the status (Completed)',
      async (status, expected) => {
        const { promise } = await fixture();
        await prisma.promise.update({ where: { id: promise.output.id }, data: { completedAt: new Date() } });
        await expect(promiseService.exists({ id: promise.output.id, status })).resolves.toBe(expected);
      }
    );

    test.each([
      [PromiseUserRole.HOST, true],
      [PromiseUserRole.ATTENDEE, false],
      [PromiseUserRole.ALL, true],
    ])('should return false if the promise exists by filtering with the role (Host)', async (role, expected) => {
      const { promise, host } = await fixture();
      await expect(promiseService.exists({ id: promise.output.id, role, userId: host.output.id })).resolves.toBe(
        expected
      );
    });

    test.each([
      [PromiseUserRole.HOST, false],
      [PromiseUserRole.ATTENDEE, true],
      [PromiseUserRole.ALL, true],
    ])('should return false if the promise exists by filtering with the role (Attendee)', async (role, expected) => {
      const { promise, attendees } = await fixture();
      await expect(
        promiseService.exists({ id: promise.output.id, role, userId: attendees[0].output.id })
      ).resolves.toBe(expected);
    });

    test.each([
      [PromiseStatus.AVAILABLE, PromiseUserRole.HOST, true],
      [PromiseStatus.AVAILABLE, PromiseUserRole.ATTENDEE, false],
      [PromiseStatus.AVAILABLE, PromiseUserRole.ALL, true],
    ])(
      'should return false if the promise exists by filtering with the status (Available) and role (Host)',
      async (status, role, expected) => {
        const { promise, host } = await fixture();
        await prisma.promise.update({ where: { id: promise.output.id }, data: { promisedAt: addDays(new Date(), 1) } });
        await expect(
          promiseService.exists({ id: promise.output.id, status, role, userId: host.output.id })
        ).resolves.toBe(expected);
      }
    );

    test.each([
      [PromiseStatus.AVAILABLE, PromiseUserRole.HOST, false],
      [PromiseStatus.AVAILABLE, PromiseUserRole.ATTENDEE, true],
      [PromiseStatus.AVAILABLE, PromiseUserRole.ALL, true],
    ])(
      'should return false if the promise exists by filtering with the status (Available) and role (Attendee)',
      async (status, role, expected) => {
        const { promise, attendees } = await fixture();
        await prisma.promise.update({ where: { id: promise.output.id }, data: { promisedAt: addDays(new Date(), 1) } });

        await expect(
          promiseService.exists({ id: promise.output.id, status, role, userId: attendees[0].output.id })
        ).resolves.toBe(expected);
      }
    );

    test.each([
      [PromiseStatus.UNAVAILABLE, PromiseUserRole.HOST, true],
      [PromiseStatus.UNAVAILABLE, PromiseUserRole.ATTENDEE, false],
      [PromiseStatus.UNAVAILABLE, PromiseUserRole.ALL, true],
    ])(
      'should return false if the promise exists by filtering with the status (Unavailable) and role (Host)',
      async (status, role, expected) => {
        const { host, promise } = await fixture();
        await prisma.promise.update({ where: { id: promise.output.id }, data: { promisedAt: subDays(new Date(), 1) } });
        await expect(
          promiseService.exists({ id: promise.output.id, status, role, userId: host.output.id })
        ).resolves.toBe(expected);
      }
    );

    test.each([
      [PromiseStatus.UNAVAILABLE, PromiseUserRole.HOST, false],
      [PromiseStatus.UNAVAILABLE, PromiseUserRole.ATTENDEE, true],
      [PromiseStatus.UNAVAILABLE, PromiseUserRole.ALL, true],
    ])(
      'should return false if the promise exists by filtering with the status (Unavailable) and role (Attendee)',
      async (status, role, expected) => {
        const { promise, attendees } = await fixture();
        await prisma.promise.update({ where: { id: promise.output.id }, data: { promisedAt: subDays(new Date(), 1) } });
        await expect(
          promiseService.exists({ id: promise.output.id, status, role, userId: attendees[0].output.id })
        ).resolves.toBe(expected);
      }
    );

    test.each([
      [PromiseStatus.ALL, PromiseUserRole.HOST, true],
      [PromiseStatus.ALL, PromiseUserRole.ATTENDEE, false],
      [PromiseStatus.ALL, PromiseUserRole.ALL, true],
    ])(
      'should return true if the promise exists by filtering with the status (All) and role (Host)',
      async (status, role, expected) => {
        const { promise, host } = await fixture();
        await expect(
          promiseService.exists({ id: promise.output.id, status, role, userId: host.output.id })
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
        const { promise, attendees } = await fixture();
        await expect(
          promiseService.exists({ id: promise.output.id, status, role, userId: attendees[0].output.id })
        ).resolves.toBe(expected);
      }
    );
  });

  describe(PromiseService.prototype.findAll, () => {
    test('should return promises by the user', async () => {
      const host = await prisma.user.create({ data: createUser() });
      const fs = await fixtures(3, { hostId: host.id });
      const result = await promiseService.findAll({ role: PromiseUserRole.ALL, userId: host.id });
      expect(result).toHaveLength(3);
      expect(result).toMatchObject(
        R.pipe(
          fs,
          R.map((f) => ({
            ...f.promise.output,
            hostId: host.id,
            updatedAt: expect.any(Date),
          })),
          R.sort((a, b) => a.id - b.id)
        )
      );
    });

    test('should return empty array if the user does not have any promises', async () => {
      await expect(promiseService.findAll({ role: PromiseUserRole.ALL, userId: -1 })).resolves.toEqual([]);
    });

    test.each([
      [PromiseUserRole.HOST, true],
      [PromiseUserRole.ATTENDEE, false],
      [PromiseUserRole.ALL, true],
    ])('should return promises by the user with the role (Host)', async (role, expected) => {
      const host = await prisma.user.create({ data: createUser() });
      const fs = await fixtures(3, { hostId: host.id });
      const result = await promiseService.findAll({ role, userId: host.id });
      if (expected) {
        expect(result).toHaveLength(3);
        expect(result).toMatchObject(
          R.pipe(
            fs,
            R.map((f) => ({
              ...f.promise.output,
              hostId: host.id,
              updatedAt: expect.any(Date),
            })),
            R.sort((a, b) => a.id - b.id)
          )
        );
      } else {
        expect(result).toEqual([]);
      }
    });

    test.each([
      [PromiseUserRole.HOST, false],
      [PromiseUserRole.ATTENDEE, true],
      [PromiseUserRole.ALL, true],
    ])('should return promises by the user with the role (Attendee)', async (role, expected) => {
      await prisma.promise.deleteMany();

      const { host, promise, attendees, destination } = await fixture();
      const updatedPromise = await prisma.promise.update({
        where: { id: promise.output.id },
        data: { promisedAt: addDays(new Date(), 1) },
      });
      const result = await promiseService.findAll({ role, userId: attendees[0].output.id });

      if (expected) {
        expect(result).toMatchObject([
          {
            ...updatedPromise,
            host: R.pick(host.output, ['id', 'username', 'profileUrl']),
            users: [host.output, ...attendees.map((a) => a.output)].map((user) => ({ user })),
            destination: destination.output,
          },
        ]);
      } else {
        expect(result).toEqual([]);
      }
    });

    test.each([
      [PromiseStatus.AVAILABLE, PromiseUserRole.HOST, true],
      [PromiseStatus.AVAILABLE, PromiseUserRole.ATTENDEE, false],
      [PromiseStatus.AVAILABLE, PromiseUserRole.ALL, true],
    ])(
      'should return promises by the user with the status (Available) and role (Host)',
      async (status, role, expected) => {
        await prisma.promise.deleteMany();

        const { host, promise, attendees, destination } = await fixture();
        const updatedPromise = await prisma.promise.update({
          where: { id: promise.output.id },
          data: { promisedAt: addDays(new Date(), 1) },
        });
        const result = await promiseService.findAll({ role, userId: host.output.id, status });

        if (expected) {
          expect(result).toMatchObject([
            {
              ...updatedPromise,
              host: R.pick(host.output, ['id', 'username', 'profileUrl']),
              users: [host.output, ...attendees.map((a) => a.output)].map((user) => ({ user })),
              destination: destination.output,
            },
          ]);
        } else {
          expect(result).toEqual([]);
        }
      }
    );

    test.each([
      [PromiseStatus.AVAILABLE, PromiseUserRole.HOST, false],
      [PromiseStatus.AVAILABLE, PromiseUserRole.ATTENDEE, true],
      [PromiseStatus.AVAILABLE, PromiseUserRole.ALL, true],
    ])(
      'should return promises by the user with the status (Available) and role (Attendee)',
      async (status, role, expected) => {
        await prisma.promise.deleteMany();

        const { host, promise, attendees, destination } = await fixture();
        const updatedPromise = await prisma.promise.update({
          where: { id: promise.output.id },
          data: { promisedAt: addDays(new Date(), 1) },
        });
        const result = await promiseService.findAll({ role, userId: attendees[0].output.id, status });

        if (expected) {
          expect(result).toMatchObject([
            {
              ...updatedPromise,
              host: R.pick(host.output, ['id', 'username', 'profileUrl']),
              users: [host.output, ...attendees.map((a) => a.output)].map((user) => ({ user })),
              destination: destination.output,
            },
          ]);
        } else {
          expect(result).toEqual([]);
        }
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

        const { host, promise, attendees, destination } = await fixture();
        const updatedPromise = await prisma.promise.update({
          where: { id: promise.output.id },
          data: { promisedAt: subDays(new Date(), 1) },
        });
        const result = await promiseService.findAll({ role, userId: host.output.id, status });

        if (expected) {
          expect(result).toMatchObject([
            {
              ...updatedPromise,
              host: R.pick(host.output, ['id', 'username', 'profileUrl']),
              users: [host.output, ...attendees.map((a) => a.output)].map((user) => ({ user })),
              destination: destination.output,
            },
          ]);
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
        const { host, promise, attendees, destination } = await fixture();
        const attendee = attendees[0].output;
        const updatedPromise = await prisma.promise.update({
          where: { id: promise.output.id },
          data: { promisedAt: subDays(new Date(), 1) },
        });
        const users = [host.output, ...attendees.map((a) => a.output)];
        const result = await promiseService.findAll({ role, userId: attendee.id, status });

        if (expected) {
          expect(result).toMatchObject([
            {
              ...updatedPromise,
              host: R.pick(host.output, ['id', 'username', 'profileUrl']),
              users: users.map((user) => ({ user })),
              destination: destination.output,
            },
          ]);
        } else {
          expect(result).toEqual([]);
        }
      }
    );
  });

  describe(PromiseService.prototype.findOne, () => {
    test('should return a promise by the id', async () => {
      const { promise } = await fixture();
      await expect(promiseService.findOne({ id: promise.output.id })).resolves.toMatchObject(promise.output);
    });

    test('should throw an error if the promise does not exist', async () => {
      await expect(promiseService.findOne({ id: -1 })).rejects.toEqual(PromiseServiceError.NotFoundPromise);
    });
  });

  describe(PromiseService.prototype.create, () => {
    test('should create a simple promise', async () => {
      const host = await prisma.user.create({ data: createUser() });
      const promiseInput = {
        ...createPromise({ hostId: host.id }),
        themeIds: [],
        destination: null,
        promisedAt: formatISO(addDays(new Date(), 1)),
      } satisfies InputCreatePromiseDTO;
      const result = await promiseService.create(host.id, promiseInput);

      expect(result).toMatchObject({
        ...R.omit(promiseInput, ['id', 'themeIds']),
        promisedAt: new Date(promiseInput.promisedAt),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    test('should create a promise with themes', async () => {
      const host = await prisma.user.create({ data: createUser() });
      const themes = await Promise.all(R.times(3, () => prisma.theme.create({ data: createTheme() })));
      const promiseInput = {
        ...createPromise({ hostId: host.id }),
        themeIds: themes.map((theme) => theme.id),
        destination: null,
        promisedAt: formatISO(addDays(new Date(), 1)),
      } satisfies InputCreatePromiseDTO;
      const result = await promiseService.create(host.id, promiseInput);

      expect(result).toMatchObject({
        ...R.omit(promiseInput, ['id', 'themeIds']),
        themes: themes.map((theme) => ({ theme })),
        promisedAt: new Date(promiseInput.promisedAt),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    test('should create a promise with a destination', async () => {
      const host = await prisma.user.create({ data: createUser() });

      const destination = {
        ...createLocation(),
        latitude: 37.0,
        longitude: 127.0,
      } satisfies InputLocationDTO;

      const promiseInput = {
        ...createPromise({ hostId: host.id }),
        themeIds: [],
        destination,
        promisedAt: formatISO(addDays(new Date(), 1)),
      } satisfies InputCreatePromiseDTO;
      const result = await promiseService.create(host.id, promiseInput);

      expect(result).toMatchObject({
        ...R.omit(promiseInput, ['id', 'themeIds', 'destination']),
        destination: {
          ...destination,
          latitude: new Prisma.Decimal(destination.latitude),
          longitude: new Prisma.Decimal(destination.longitude),
        },
        destinationId: expect.any(Number),
        promisedAt: new Date(promiseInput.promisedAt),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });
  });

  describe(PromiseService.prototype.update, () => {
    test('should update a simple promise', async () => {
      const { host, promise } = await fixture();

      const updatedPromiseInput = {
        ...createPromise({ hostId: host.input.id }),
        title: 'updated title',
        destinationType: DestinationType.DYNAMIC,
        themeIds: [],
        destination: null,
        promisedAt: formatISO(addDays(new Date(), 2)),
      } satisfies InputUpdatePromiseDTO;

      const result = await promiseService.update(promise.output.id, host.output.id, updatedPromiseInput);

      expect(result).toMatchObject({
        ...R.omit(updatedPromiseInput, ['themeIds']),
        id: promise.output.id,
        promisedAt: new Date(updatedPromiseInput.promisedAt),
        updatedAt: expect.any(Date),
      });
    });

    test('should update a promise with themes', async () => {
      const { host, promise, themes } = await fixture();
      const newThemes = await Promise.all(R.times(3, () => prisma.theme.create({ data: createTheme() })));
      const updatedThemes = [...themes.map((t) => t.output).slice(1), ...newThemes.slice(1)];

      const updatedPromiseInput = {
        ...promise.input,
        title: 'updated title',
        destinationType: DestinationType.DYNAMIC,
        themeIds: updatedThemes.map((theme) => theme.id),
        destination: null,
        promisedAt: formatISO(addDays(new Date(), 2)),
      } satisfies InputUpdatePromiseDTO;

      const result = await promiseService.update(promise.input.id, host.input.id, updatedPromiseInput);

      expect(result).toMatchObject({
        ...R.omit(updatedPromiseInput, ['themeIds']),
        themes: updatedThemes.map((theme) => ({ theme })),
        promisedAt: new Date(updatedPromiseInput.promisedAt),
        updatedAt: expect.any(Date),
      });
    });

    test('should update a promise with a destination', async () => {
      const { host, promise } = await fixture();

      const updatedDestination = {
        ...createLocation(),
        latitude: 37.0,
        longitude: 127.0,
      } satisfies InputLocationDTO;
      const updatedPromiseInput = {
        ...promise.input,
        title: 'updated title',
        destinationType: DestinationType.DYNAMIC,
        themeIds: [],
        destination: updatedDestination,
        promisedAt: formatISO(addDays(new Date(), 2)),
      } satisfies InputUpdatePromiseDTO;

      const result = await promiseService.update(promise.input.id, host.input.id, updatedPromiseInput);

      expect(result).toMatchObject({
        ...R.omit(updatedPromiseInput, ['themeIds', 'destination']),
        destination: {
          ...updatedDestination,
          latitude: new Prisma.Decimal(updatedDestination.latitude),
          longitude: new Prisma.Decimal(updatedDestination.longitude),
          updatedAt: expect.any(Date),
        },
        destinationId: expect.any(Number),
        promisedAt: new Date(updatedPromiseInput.promisedAt),
        updatedAt: expect.any(Date),
      });
    });

    test('should throw an error if the attendees try to update the promise', async () => {
      const { promise } = await fixture();
      await expect(promiseService.update(promise.output.id, -1, {} as any)).rejects.toEqual(
        PromiseServiceError.OnlyHostUpdatable
      );
    });

    test('should throw an error if the promise does not exist', async () => {
      await expect(promiseService.update(0, 0, {} as any)).rejects.toEqual(PromiseServiceError.NotFoundPromise);
    });
  });

  describe(PromiseService.prototype.getStartLocation, () => {
    test('should return a start location by the promise id', async () => {
      const { host, promise, attendees, startLocations } = await fixture();
      const startLocation = await prisma.location.create({ data: createLocation() });
      await prisma.promiseUser.update({
        where: { identifier: { promiseId: promise.output.id, userId: host.output.id } },
        data: { startLocationId: startLocation.id },
      });
      await expect(promiseService.getStartLocation(promise.output.id, host.output.id)).resolves.toMatchObject(
        startLocation
      );

      await expect(promiseService.getStartLocation(promise.output.id, attendees[0].output.id)).resolves.toMatchObject(
        startLocations[0].output
      );
    });

    test('should throw an error if the promise does not exist', async () => {
      await expect(promiseService.getStartLocation(0, 0)).rejects.toEqual(PromiseServiceError.NotFoundPromise);
    });

    test('should throw an error if the user is not attending the promise', async () => {
      const { promise } = await fixture();
      await expect(promiseService.getStartLocation(promise.output.id, -1)).rejects.toEqual(
        PromiseServiceError.NotFoundPromise
      );
    });

    test('should throw an error if the user does not have a start location', async () => {
      const { host, promise } = await fixture();
      await expect(promiseService.getStartLocation(promise.output.id, host.output.id)).rejects.toEqual(
        PromiseServiceError.NotFoundStartLocation
      );
    });
  });

  describe(PromiseService.prototype.updateStartLocation, () => {
    test('should update a start location by the promise id', async () => {
      const { host, promise } = await fixture();
      const updatedStartLocation = {
        ...createLocation(),
        latitude: 37.0,
        longitude: 127.0,
      } satisfies InputLocationDTO;

      await expect(
        promiseService.updateStartLocation(promise.output.id, host.output.id, updatedStartLocation)
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
      const { promise } = await fixture();
      await expect(promiseService.updateStartLocation(promise.output.id, -1, {} as any)).rejects.toEqual(
        PromiseServiceError.NotFoundPromise
      );
    });
  });

  describe(PromiseService.prototype.deleteStartLocation, () => {
    test('should delete a start location by the promise id', async () => {
      const { promise, attendees } = await fixture();
      await expect(
        promiseService.deleteStartLocation(promise.output.id, attendees[0].output.id)
      ).resolves.toBeUndefined();
      await expect(promiseService.getStartLocation(promise.output.id, attendees[0].output.id)).rejects.toEqual(
        PromiseServiceError.NotFoundStartLocation
      );
    });

    test('should throw an error if the promise does not exist', async () => {
      await expect(promiseService.deleteStartLocation(0, 0)).rejects.toEqual(PromiseServiceError.NotFoundPromise);
    });
  });

  describe(PromiseService.prototype.attend, () => {
    test('should attend a promise by the user', async () => {
      const { host, promise, attendees } = await fixture();
      const newAttendee = await prisma.user.create({ data: createUser() });
      await expect(promiseService.attend(promise.output.id, newAttendee.id)).resolves.toMatchObject({
        id: promise.output.id,
      });
      const users = [host.output, ...attendees.map((attendee) => attendee.output), newAttendee];
      await expect(promiseService.findOne({ id: promise.output.id })).resolves.toMatchObject({
        ...promise.output,
        users: users.map((user) => ({ user })),
      });
    });

    test('should throw an error if the promise does not exist', async () => {
      await expect(promiseService.attend(0, 0)).rejects.toEqual(PromiseServiceError.NotFoundPromise);
    });

    test('should throw an error if the user is already attending the promise', async () => {
      const { promise, attendees } = await fixture();
      await expect(promiseService.attend(promise.output.id, attendees[0].output.id)).rejects.toEqual(
        PromiseServiceError.AlreadyAttended
      );
    });

    test('should throw an error when occurred an unexpected error', async () => {
      await expect(promiseService.attend('unknown' as any, 'unknown' as any)).rejects.toThrow();
    });
  });

  describe(PromiseService.prototype.leave, () => {
    test('should leave a promise by the user', async () => {
      const { host, promise, attendees } = await fixture();
      const attendee = attendees.splice(0, 1)[0];
      await expect(promiseService.leave(promise.output.id, attendee.output.id)).resolves.toBeUndefined();
      await expect(promiseService.findOne({ id: promise.output.id })).resolves.toMatchObject({
        ...promise.output,
        users: [{ user: host.output }, ...attendees.map((attendee) => ({ user: attendee.output }))],
      });
    });

    test('should throw an error if the promise does not exist', async () => {
      await expect(promiseService.leave(0, 0)).rejects.toEqual(PromiseServiceError.NotFoundPromise);
    });

    test('should throw an error if the user is not attending the promise', async () => {
      const { promise } = await fixture();
      await expect(promiseService.leave(promise.output.id, -1)).rejects.toEqual(PromiseServiceError.NotFoundPromise);
    });

    test('should throw an error if the user is the host of the promise', async () => {
      const { host, promise } = await fixture();
      await expect(promiseService.leave(promise.output.id, host.output.id)).rejects.toEqual(
        PromiseServiceError.HostCannotLeave
      );
    });

    test('should throw an error when occurred an unexpected error', async () => {
      await expect(promiseService.leave('unknown' as any, 'unknown' as any)).rejects.toThrow();
    });
  });

  describe(PromiseService.prototype.getAttendees, () => {
    test('should return attendees by the promise id', async () => {
      const { host, promise, attendees } = await fixture();
      const result = await promiseService.getAttendees(promise.output.id);
      const users = [host.output, ...attendees.map((attendee) => attendee.output)];
      expect(result).toHaveLength(4);
      expect(result).toMatchObject(users.map((user) => ({ userId: user.id })));
    });

    test('should return attendees by the promise id and the user ids', async () => {
      const { host, promise, attendees } = await fixture();
      const userIds = [host.output.id, attendees[0].output.id];
      const result = await promiseService.getAttendees(promise.output.id, userIds);
      expect(result).toHaveLength(2);
      expect(result).toMatchObject(userIds.map((userId) => ({ userId })));
    });
  });

  describe(PromiseService.prototype.getThemes, () => {
    test('should return themes by the promise id', async () => {
      await prisma.theme.deleteMany();
      const { themes } = await fixture();
      await expect(promiseService.getThemes()).resolves.toMatchObject(
        themes.map(({ input: theme }) => ({ id: theme.id, name: expect.any(String) }))
      );
    });
  });
});
