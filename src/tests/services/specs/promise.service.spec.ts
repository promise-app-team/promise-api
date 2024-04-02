import { Test } from '@nestjs/testing';
import { Prisma, Promise as PromiseModel, User as UserModel } from '@prisma/client';
import { addDays, formatISO, subDays } from 'date-fns';
import * as R from 'remeda';

import { InputCreatePromiseDTO, InputLocationDTO, InputUpdatePromiseDTO } from '@/modules/promise/promise.dto';
import { PromiseStatus, PromiseUserRole } from '@/modules/promise/promise.enum';
import { PromiseService, PromiseServiceError } from '@/modules/promise/promise.service';
import { DestinationType } from '@/prisma/prisma.entity';
import { PrismaService } from '@/prisma/prisma.service';
import { createLocationBuilder } from '@/tests/fixtures/locations';
import { createPromiseBuilder } from '@/tests/fixtures/promises';
import { createThemeBuilder } from '@/tests/fixtures/themes';
import { createUserBuilder } from '@/tests/fixtures/users';
import { createPrismaClient } from '@/tests/prisma';

const [MIN, MAX] = [3e5, 4e5];
const createUser = createUserBuilder(MIN);
const createLocation = createLocationBuilder(MIN);
const createPromise = createPromiseBuilder(MIN);
const createTheme = createThemeBuilder(MIN);

describe(PromiseService, () => {
  let promiseService: PromiseService;
  const prisma = createPrismaClient({ logging: false });

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [PromiseService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    promiseService = module.get(PromiseService);
  });

  beforeEach(async () => {
    await prisma.promise.deleteMany({ where: { id: { gte: MIN, lt: MAX } } });
    await prisma.location.deleteMany({ where: { id: { gte: MIN, lt: MAX } } });
    await prisma.theme.deleteMany({ where: { id: { gte: MIN, lt: MAX } } });
    await prisma.user.deleteMany({ where: { id: { gte: MIN, lt: MAX } } });
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

  const tomorrow = addDays(new Date(), 1);
  const yesterday = subDays(new Date(), 1);

  describe(PromiseService.prototype.exists, () => {
    test('should return true if the promise exists by the id', async () => {
      const { promise } = await fixture();
      await expect(promiseService.exists({ id: promise.input.id })).resolves.toBeTrue();
    });

    test('should return false if the promise does not exist by the id', async () => {
      await expect(promiseService.exists({ id: -1 })).resolves.toBeFalse();
    });
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
      await expect(promiseService.findAll({ role: PromiseUserRole.ALL, userId: -1 })).resolves.toBeArrayOfSize(0);
    });
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

  describe('filter by provided condition', () => {
    type Fixture = {
      host: UserModel;
      promise: PromiseModel;
    };

    let [fixture1, fixture2, fixture3, fixture4, fixture5, fixture6]: Fixture[] = [];

    const hosts = () => [fixture1, fixture2, fixture3, fixture4, fixture5, fixture6].map((f) => f.host);
    const promises = () => [fixture1, fixture2, fixture3, fixture4, fixture5, fixture6].map((f) => f.promise);

    beforeEach(async () => {
      [fixture1, fixture2, fixture3, fixture4, fixture5, fixture6] = await Promise.all(
        R.times(6, async () => {
          const host = await prisma.user.create({ data: createUser() });
          const promise = await prisma.promise.create({ data: createPromise({ id: host.id, hostId: host.id }) });
          return { host, promise };
        })
      ).then((fs) => fs.sort((a, b) => a.promise.id - b.promise.id));

      const { host: h1, promise: p1 } = fixture1;
      const { host: _h2, promise: p2 } = fixture2;
      const { host: h3, promise: p3 } = fixture3;
      const { host: h4, promise: p4 } = fixture4;
      const { host: h5, promise: p5 } = fixture5;
      const { host: _h6, promise: p6 } = fixture6;

      /**
       * promise1: host1 [host1]               available   (promisedAt = tomorrow)
       * promise2: host2 [host2, host3]        available   (promisedAt = tomorrow)
       * promise3: host3 [host3]               unavailable (promisedAt = yesterday)
       * promise4: host4 [host4, host5]        unavailable (promisedAt = yesterday)
       * promise5: host5 [host5, host1, host4] available   (promisedAt = tomorrow, completedAt = null)
       * promise6: host6 [host6, host1, host4] unavailable (promisedAt = tomorrow, completedAt = yesterday)
       */
      [fixture1.promise, fixture2.promise, fixture3.promise, fixture4.promise, fixture5.promise, fixture6.promise] =
        await Promise.all([
          prisma.promise.update({ where: { id: p1.id }, data: { promisedAt: tomorrow } }),
          prisma.promise.update({ where: { id: p2.id }, data: { promisedAt: tomorrow } }),
          prisma.promise.update({ where: { id: p3.id }, data: { promisedAt: yesterday } }),
          prisma.promise.update({ where: { id: p4.id }, data: { promisedAt: yesterday } }),
          prisma.promise.update({ where: { id: p5.id }, data: { promisedAt: tomorrow } }),
          prisma.promise.update({ where: { id: p6.id }, data: { promisedAt: tomorrow, completedAt: yesterday } }),

          prisma.promiseUser.create({ data: { userId: h3.id, promiseId: p2.id } }),
          prisma.promiseUser.create({ data: { userId: h5.id, promiseId: p4.id } }),
          prisma.promiseUser.create({ data: { userId: h1.id, promiseId: p5.id } }),
          prisma.promiseUser.create({ data: { userId: h4.id, promiseId: p5.id } }),
          prisma.promiseUser.create({ data: { userId: h1.id, promiseId: p6.id } }),
          prisma.promiseUser.create({ data: { userId: h4.id, promiseId: p6.id } }),
        ]);
    });

    test.each(Object.values(PromiseStatus))('should return promises by the status (%s) w/o userId', async (status) => {
      const [p1, p2, p3, p4, p5, p6] = promises();
      const cond = () => ({ status });

      switch (status) {
        case PromiseStatus.AVAILABLE:
          await expect(promiseService.exists(cond())).resolves.toBeTrue();
          await expect(promiseService.findAll(cond())).resolves.toMatchObject([p1, p2, p5]);
          await expect(promiseService.findOne(cond())).resolves.toMatchObject(p1);
          break;
        case PromiseStatus.UNAVAILABLE:
          await expect(promiseService.exists(cond())).resolves.toBeTrue();
          await expect(promiseService.findAll(cond())).resolves.toHaveLength(3);
          await expect(promiseService.findAll(cond())).resolves.toMatchObject([p3, p4, p6]);
          await expect(promiseService.findOne(cond())).resolves.toMatchObject(p3);
          break;
        case PromiseStatus.ALL:
          await expect(promiseService.exists(cond())).resolves.toBeTrue();
          await expect(promiseService.findAll(cond())).resolves.toMatchObject([p1, p2, p3, p4, p5, p6]);
          await expect(promiseService.findOne(cond())).resolves.toMatchObject(p1);
      }
    });

    test.each(Object.values(PromiseStatus))('should return promises by the status (%s) w/ userId', async (status) => {
      const [h1, h2, h3, h4, h5, h6] = hosts();
      const [p1, p2, p3, p4, p5, p6] = promises();
      const hx = await prisma.user.create({ data: createUser() });
      const cond = (id: number) => ({ status, userId: id });

      switch (status) {
        case PromiseStatus.AVAILABLE:
          await expect(promiseService.exists(cond(h1.id))).resolves.toBeTrue();
          await expect(promiseService.exists(cond(h2.id))).resolves.toBeTrue();
          await expect(promiseService.exists(cond(h3.id))).resolves.toBeTrue();
          await expect(promiseService.exists(cond(h4.id))).resolves.toBeTrue();
          await expect(promiseService.exists(cond(h5.id))).resolves.toBeTrue();
          await expect(promiseService.exists(cond(h6.id))).resolves.toBeFalse();
          await expect(promiseService.exists(cond(hx.id))).resolves.toBeFalse();

          await expect(promiseService.findAll(cond(h1.id))).resolves.toMatchObject([p1, p5]);
          await expect(promiseService.findAll(cond(h2.id))).resolves.toMatchObject([p2]);
          await expect(promiseService.findAll(cond(h3.id))).resolves.toMatchObject([p2]);
          await expect(promiseService.findAll(cond(h4.id))).resolves.toMatchObject([p5]);
          await expect(promiseService.findAll(cond(h5.id))).resolves.toMatchObject([p5]);
          await expect(promiseService.findAll(cond(h6.id))).resolves.toBeArrayOfSize(0);
          await expect(promiseService.findAll(cond(hx.id))).resolves.toBeArrayOfSize(0);

          await expect(promiseService.findOne(cond(h1.id))).resolves.toMatchObject(p1);
          await expect(promiseService.findOne(cond(h2.id))).resolves.toMatchObject(p2);
          await expect(promiseService.findOne(cond(h3.id))).resolves.toMatchObject(p2);
          await expect(promiseService.findOne(cond(h4.id))).resolves.toMatchObject(p5);
          await expect(promiseService.findOne(cond(h5.id))).resolves.toMatchObject(p5);
          await expect(promiseService.findOne(cond(h6.id))).rejects.toEqual(PromiseServiceError.NotFoundPromise);
          await expect(promiseService.findOne(cond(hx.id))).rejects.toEqual(PromiseServiceError.NotFoundPromise);
          break;
        case PromiseStatus.UNAVAILABLE:
          await expect(promiseService.exists(cond(h1.id))).resolves.toBeTrue();
          await expect(promiseService.exists(cond(h2.id))).resolves.toBeFalse();
          await expect(promiseService.exists(cond(h3.id))).resolves.toBeTrue();
          await expect(promiseService.exists(cond(h4.id))).resolves.toBeTrue();
          await expect(promiseService.exists(cond(h5.id))).resolves.toBeTrue();
          await expect(promiseService.exists(cond(h6.id))).resolves.toBeTrue();
          await expect(promiseService.exists(cond(hx.id))).resolves.toBeFalse();

          await expect(promiseService.findAll(cond(h1.id))).resolves.toMatchObject([p6]);
          await expect(promiseService.findAll(cond(h2.id))).resolves.toBeArrayOfSize(0);
          await expect(promiseService.findAll(cond(h3.id))).resolves.toMatchObject([p3]);
          await expect(promiseService.findAll(cond(h4.id))).resolves.toMatchObject([p4, p6]);
          await expect(promiseService.findAll(cond(h5.id))).resolves.toMatchObject([p4]);
          await expect(promiseService.findAll(cond(h6.id))).resolves.toMatchObject([p6]);
          await expect(promiseService.findAll(cond(hx.id))).resolves.toBeArrayOfSize(0);

          await expect(promiseService.findOne(cond(h1.id))).resolves.toMatchObject(p6);
          await expect(promiseService.findOne(cond(h2.id))).rejects.toEqual(PromiseServiceError.NotFoundPromise);
          await expect(promiseService.findOne(cond(h3.id))).resolves.toMatchObject(p3);
          await expect(promiseService.findOne(cond(h4.id))).resolves.toMatchObject(p4);
          await expect(promiseService.findOne(cond(h5.id))).resolves.toMatchObject(p4);
          await expect(promiseService.findOne(cond(h6.id))).resolves.toMatchObject(p6);
          await expect(promiseService.findOne(cond(hx.id))).rejects.toEqual(PromiseServiceError.NotFoundPromise);
          break;
        case PromiseStatus.ALL:
          await expect(promiseService.exists(cond(h1.id))).resolves.toBeTrue();
          await expect(promiseService.exists(cond(h2.id))).resolves.toBeTrue();
          await expect(promiseService.exists(cond(h3.id))).resolves.toBeTrue();
          await expect(promiseService.exists(cond(h4.id))).resolves.toBeTrue();
          await expect(promiseService.exists(cond(h5.id))).resolves.toBeTrue();
          await expect(promiseService.exists(cond(h6.id))).resolves.toBeTrue();
          await expect(promiseService.exists(cond(hx.id))).resolves.toBeFalse();

          await expect(promiseService.findAll(cond(h1.id))).resolves.toMatchObject([p1, p5, p6]);
          await expect(promiseService.findAll(cond(h2.id))).resolves.toMatchObject([p2]);
          await expect(promiseService.findAll(cond(h3.id))).resolves.toMatchObject([p2, p3]);
          await expect(promiseService.findAll(cond(h4.id))).resolves.toMatchObject([p4, p5, p6]);
          await expect(promiseService.findAll(cond(h5.id))).resolves.toMatchObject([p4, p5]);
          await expect(promiseService.findAll(cond(h6.id))).resolves.toMatchObject([p6]);
          await expect(promiseService.findAll(cond(hx.id))).resolves.toBeArrayOfSize(0);

          await expect(promiseService.findOne(cond(h1.id))).resolves.toMatchObject(p1);
          await expect(promiseService.findOne(cond(h2.id))).resolves.toMatchObject(p2);
          await expect(promiseService.findOne(cond(h3.id))).resolves.toMatchObject(p2);
          await expect(promiseService.findOne(cond(h4.id))).resolves.toMatchObject(p4);
          await expect(promiseService.findOne(cond(h5.id))).resolves.toMatchObject(p4);
          await expect(promiseService.findOne(cond(h6.id))).resolves.toMatchObject(p6);
          await expect(promiseService.findOne(cond(hx.id))).rejects.toEqual(PromiseServiceError.NotFoundPromise);
      }
    });

    test.each(Object.values(PromiseUserRole))(
      'should return promises by the user with the role (%s) w/ userId',
      async (role) => {
        const [h1, h2, h3, h4, h5, h6] = hosts();
        const [p1, p2, p3, p4, p5, p6] = promises();
        const hx = await prisma.user.create({ data: createUser() });
        const cond = (id: number) => ({ role, userId: id });

        switch (role) {
          case PromiseUserRole.HOST:
            await expect(promiseService.exists(cond(h1.id))).resolves.toBeTrue();
            await expect(promiseService.exists(cond(h2.id))).resolves.toBeTrue();
            await expect(promiseService.exists(cond(h3.id))).resolves.toBeTrue();
            await expect(promiseService.exists(cond(h4.id))).resolves.toBeTrue();
            await expect(promiseService.exists(cond(h5.id))).resolves.toBeTrue();
            await expect(promiseService.exists(cond(h6.id))).resolves.toBeTrue();
            await expect(promiseService.exists(cond(hx.id))).resolves.toBeFalse();

            await expect(promiseService.findAll(cond(h1.id))).resolves.toMatchObject([p1]);
            await expect(promiseService.findAll(cond(h2.id))).resolves.toMatchObject([p2]);
            await expect(promiseService.findAll(cond(h3.id))).resolves.toMatchObject([p3]);
            await expect(promiseService.findAll(cond(h4.id))).resolves.toMatchObject([p4]);
            await expect(promiseService.findAll(cond(h5.id))).resolves.toMatchObject([p5]);
            await expect(promiseService.findAll(cond(h6.id))).resolves.toMatchObject([p6]);
            await expect(promiseService.findAll(cond(hx.id))).resolves.toBeArrayOfSize(0);

            await expect(promiseService.findOne(cond(h1.id))).resolves.toMatchObject(p1);
            await expect(promiseService.findOne(cond(h2.id))).resolves.toMatchObject(p2);
            await expect(promiseService.findOne(cond(h3.id))).resolves.toMatchObject(p3);
            await expect(promiseService.findOne(cond(h4.id))).resolves.toMatchObject(p4);
            await expect(promiseService.findOne(cond(h5.id))).resolves.toMatchObject(p5);
            await expect(promiseService.findOne(cond(h6.id))).resolves.toMatchObject(p6);
            await expect(promiseService.findOne(cond(hx.id))).rejects.toEqual(PromiseServiceError.NotFoundPromise);
            break;
          case PromiseUserRole.ATTENDEE:
            await expect(promiseService.exists(cond(h1.id))).resolves.toBeTrue();
            await expect(promiseService.exists(cond(h2.id))).resolves.toBeFalse();
            await expect(promiseService.exists(cond(h3.id))).resolves.toBeTrue();
            await expect(promiseService.exists(cond(h4.id))).resolves.toBeTrue();
            await expect(promiseService.exists(cond(h5.id))).resolves.toBeTrue();
            await expect(promiseService.exists(cond(h6.id))).resolves.toBeFalse();
            await expect(promiseService.exists(cond(hx.id))).resolves.toBeFalse();

            await expect(promiseService.findAll(cond(h1.id))).resolves.toMatchObject([p5, p6]);
            await expect(promiseService.findAll(cond(h2.id))).resolves.toBeArrayOfSize(0);
            await expect(promiseService.findAll(cond(h3.id))).resolves.toMatchObject([p2]);
            await expect(promiseService.findAll(cond(h4.id))).resolves.toMatchObject([p5, p6]);
            await expect(promiseService.findAll(cond(h5.id))).resolves.toMatchObject([p4]);
            await expect(promiseService.findAll(cond(h6.id))).resolves.toBeArrayOfSize(0);
            await expect(promiseService.findAll(cond(hx.id))).resolves.toBeArrayOfSize(0);

            await expect(promiseService.findOne(cond(h1.id))).resolves.toMatchObject(p5);
            await expect(promiseService.findOne(cond(h2.id))).rejects.toEqual(PromiseServiceError.NotFoundPromise);
            await expect(promiseService.findOne(cond(h3.id))).resolves.toMatchObject(p2);
            await expect(promiseService.findOne(cond(h4.id))).resolves.toMatchObject(p5);
            await expect(promiseService.findOne(cond(h5.id))).resolves.toMatchObject(p4);
            await expect(promiseService.findOne(cond(h6.id))).rejects.toEqual(PromiseServiceError.NotFoundPromise);
            await expect(promiseService.findOne(cond(hx.id))).rejects.toEqual(PromiseServiceError.NotFoundPromise);
            break;
          case PromiseUserRole.ALL:
            await expect(promiseService.exists(cond(h1.id))).resolves.toBeTrue();
            await expect(promiseService.exists(cond(h2.id))).resolves.toBeTrue();
            await expect(promiseService.exists(cond(h3.id))).resolves.toBeTrue();
            await expect(promiseService.exists(cond(h4.id))).resolves.toBeTrue();
            await expect(promiseService.exists(cond(h5.id))).resolves.toBeTrue();
            await expect(promiseService.exists(cond(h6.id))).resolves.toBeTrue();
            await expect(promiseService.exists(cond(hx.id))).resolves.toBeFalse();

            await expect(promiseService.findAll(cond(h1.id))).resolves.toMatchObject([p1, p5, p6]);
            await expect(promiseService.findAll(cond(h2.id))).resolves.toMatchObject([p2]);
            await expect(promiseService.findAll(cond(h3.id))).resolves.toMatchObject([p2, p3]);
            await expect(promiseService.findAll(cond(h4.id))).resolves.toMatchObject([p4, p5, p6]);
            await expect(promiseService.findAll(cond(h5.id))).resolves.toMatchObject([p4, p5]);
            await expect(promiseService.findAll(cond(h6.id))).resolves.toMatchObject([p6]);
            await expect(promiseService.findAll(cond(hx.id))).resolves.toBeArrayOfSize(0);

            await expect(promiseService.findOne(cond(h1.id))).resolves.toMatchObject(p1);
            await expect(promiseService.findOne(cond(h2.id))).resolves.toMatchObject(p2);
            await expect(promiseService.findOne(cond(h3.id))).resolves.toMatchObject(p2);
            await expect(promiseService.findOne(cond(h4.id))).resolves.toMatchObject(p4);
            await expect(promiseService.findOne(cond(h5.id))).resolves.toMatchObject(p4);
            await expect(promiseService.findOne(cond(h6.id))).resolves.toMatchObject(p6);
            await expect(promiseService.findOne(cond(hx.id))).rejects.toEqual(PromiseServiceError.NotFoundPromise);
        }
      }
    );

    test.each([
      [{ status: PromiseStatus.AVAILABLE, role: PromiseUserRole.HOST }],
      [{ status: PromiseStatus.UNAVAILABLE, role: PromiseUserRole.HOST }],
      [{ status: PromiseStatus.ALL, role: PromiseUserRole.HOST }],
      [{ status: PromiseStatus.AVAILABLE, role: PromiseUserRole.ATTENDEE }],
      [{ status: PromiseStatus.UNAVAILABLE, role: PromiseUserRole.ATTENDEE }],
      [{ status: PromiseStatus.ALL, role: PromiseUserRole.ATTENDEE }],
      [{ status: PromiseStatus.AVAILABLE, role: PromiseUserRole.ALL }],
      [{ status: PromiseStatus.UNAVAILABLE, role: PromiseUserRole.ALL }],
      [{ status: PromiseStatus.ALL, role: PromiseUserRole.ALL }],
    ])(`should return promises by the condition (%o) w/ userId`, async (condition) => {
      const { status, role } = condition;
      const [h1, h2, h3, h4, h5, h6] = hosts();
      const [p1, p2, p3, p4, p5, p6] = promises();
      const hx = await prisma.user.create({ data: createUser() });

      const cond = (id: number) => ({ ...condition, userId: id });

      if (status === PromiseStatus.AVAILABLE) {
        if (role === PromiseUserRole.HOST) {
          await expect(promiseService.exists(cond(h1.id))).resolves.toBeTrue();
          await expect(promiseService.exists(cond(h2.id))).resolves.toBeTrue();
          await expect(promiseService.exists(cond(h3.id))).resolves.toBeFalse();
          await expect(promiseService.exists(cond(h4.id))).resolves.toBeFalse();
          await expect(promiseService.exists(cond(h5.id))).resolves.toBeTrue();
          await expect(promiseService.exists(cond(h6.id))).resolves.toBeFalse();
          await expect(promiseService.exists(cond(hx.id))).resolves.toBeFalse();

          await expect(promiseService.findAll(cond(h1.id))).resolves.toMatchObject([p1]);
          await expect(promiseService.findAll(cond(h2.id))).resolves.toMatchObject([p2]);
          await expect(promiseService.findAll(cond(h3.id))).resolves.toBeArrayOfSize(0);
          await expect(promiseService.findAll(cond(h4.id))).resolves.toBeArrayOfSize(0);
          await expect(promiseService.findAll(cond(h5.id))).resolves.toMatchObject([p5]);
          await expect(promiseService.findAll(cond(h6.id))).resolves.toBeArrayOfSize(0);
          await expect(promiseService.findAll(cond(hx.id))).resolves.toBeArrayOfSize(0);

          await expect(promiseService.findOne(cond(h1.id))).resolves.toMatchObject(p1);
          await expect(promiseService.findOne(cond(h2.id))).resolves.toMatchObject(p2);
          await expect(promiseService.findOne(cond(h3.id))).rejects.toEqual(PromiseServiceError.NotFoundPromise);
          await expect(promiseService.findOne(cond(h4.id))).rejects.toEqual(PromiseServiceError.NotFoundPromise);
          await expect(promiseService.findOne(cond(h5.id))).resolves.toMatchObject(p5);
          await expect(promiseService.findOne(cond(h6.id))).rejects.toEqual(PromiseServiceError.NotFoundPromise);
          await expect(promiseService.findOne(cond(hx.id))).rejects.toEqual(PromiseServiceError.NotFoundPromise);
        } else if (role === PromiseUserRole.ATTENDEE) {
          await expect(promiseService.exists(cond(h1.id))).resolves.toBeTrue();
          await expect(promiseService.exists(cond(h2.id))).resolves.toBeFalse();
          await expect(promiseService.exists(cond(h3.id))).resolves.toBeTrue();
          await expect(promiseService.exists(cond(h4.id))).resolves.toBeTrue();
          await expect(promiseService.exists(cond(h5.id))).resolves.toBeFalse();
          await expect(promiseService.exists(cond(h6.id))).resolves.toBeFalse();
          await expect(promiseService.exists(cond(hx.id))).resolves.toBeFalse();

          await expect(promiseService.findAll(cond(h1.id))).resolves.toMatchObject([p5]);
          await expect(promiseService.findAll(cond(h2.id))).resolves.toBeArrayOfSize(0);
          await expect(promiseService.findAll(cond(h3.id))).resolves.toMatchObject([p2]);
          await expect(promiseService.findAll(cond(h4.id))).resolves.toMatchObject([p5]);
          await expect(promiseService.findAll(cond(h5.id))).resolves.toBeArrayOfSize(0);
          await expect(promiseService.findAll(cond(h6.id))).resolves.toBeArrayOfSize(0);
          await expect(promiseService.findAll(cond(hx.id))).resolves.toBeArrayOfSize(0);

          await expect(promiseService.findOne(cond(h1.id))).resolves.toMatchObject(p5);
          await expect(promiseService.findOne(cond(h2.id))).rejects.toEqual(PromiseServiceError.NotFoundPromise);
          await expect(promiseService.findOne(cond(h3.id))).resolves.toMatchObject(p2);
          await expect(promiseService.findOne(cond(h4.id))).resolves.toMatchObject(p5);
          await expect(promiseService.findOne(cond(h5.id))).rejects.toEqual(PromiseServiceError.NotFoundPromise);
          await expect(promiseService.findOne(cond(h6.id))).rejects.toEqual(PromiseServiceError.NotFoundPromise);
          await expect(promiseService.findOne(cond(hx.id))).rejects.toEqual(PromiseServiceError.NotFoundPromise);
        } else if (role === PromiseUserRole.ALL) {
          await expect(promiseService.exists(cond(h1.id))).resolves.toBeTrue();
          await expect(promiseService.exists(cond(h2.id))).resolves.toBeTrue();
          await expect(promiseService.exists(cond(h3.id))).resolves.toBeTrue();
          await expect(promiseService.exists(cond(h4.id))).resolves.toBeTrue();
          await expect(promiseService.exists(cond(h5.id))).resolves.toBeTrue();
          await expect(promiseService.exists(cond(h6.id))).resolves.toBeFalse();
          await expect(promiseService.exists(cond(hx.id))).resolves.toBeFalse();

          await expect(promiseService.findAll(cond(h1.id))).resolves.toMatchObject([p1, p5]);
          await expect(promiseService.findAll(cond(h2.id))).resolves.toMatchObject([p2]);
          await expect(promiseService.findAll(cond(h3.id))).resolves.toMatchObject([p2]);
          await expect(promiseService.findAll(cond(h4.id))).resolves.toMatchObject([p5]);
          await expect(promiseService.findAll(cond(h5.id))).resolves.toMatchObject([p5]);
          await expect(promiseService.findAll(cond(h6.id))).resolves.toBeArrayOfSize(0);
          await expect(promiseService.findAll(cond(hx.id))).resolves.toBeArrayOfSize(0);

          await expect(promiseService.findOne(cond(h1.id))).resolves.toMatchObject(p1);
          await expect(promiseService.findOne(cond(h2.id))).resolves.toMatchObject(p2);
          await expect(promiseService.findOne(cond(h3.id))).resolves.toMatchObject(p2);
          await expect(promiseService.findOne(cond(h4.id))).resolves.toMatchObject(p5);
          await expect(promiseService.findOne(cond(h5.id))).resolves.toMatchObject(p5);
          await expect(promiseService.findOne(cond(h6.id))).rejects.toEqual(PromiseServiceError.NotFoundPromise);
          await expect(promiseService.findOne(cond(hx.id))).rejects.toEqual(PromiseServiceError.NotFoundPromise);
        }
      } else if (status === PromiseStatus.UNAVAILABLE) {
        if (role === PromiseUserRole.HOST) {
          await expect(promiseService.exists(cond(h1.id))).resolves.toBeFalse();
          await expect(promiseService.exists(cond(h2.id))).resolves.toBeFalse();
          await expect(promiseService.exists(cond(h3.id))).resolves.toBeTrue();
          await expect(promiseService.exists(cond(h4.id))).resolves.toBeTrue();
          await expect(promiseService.exists(cond(h5.id))).resolves.toBeFalse();
          await expect(promiseService.exists(cond(h6.id))).resolves.toBeTrue();
          await expect(promiseService.exists(cond(hx.id))).resolves.toBeFalse();

          await expect(promiseService.findAll(cond(h1.id))).resolves.toBeArrayOfSize(0);
          await expect(promiseService.findAll(cond(h2.id))).resolves.toBeArrayOfSize(0);
          await expect(promiseService.findAll(cond(h3.id))).resolves.toMatchObject([p3]);
          await expect(promiseService.findAll(cond(h4.id))).resolves.toMatchObject([p4]);
          await expect(promiseService.findAll(cond(h5.id))).resolves.toBeArrayOfSize(0);
          await expect(promiseService.findAll(cond(h6.id))).resolves.toMatchObject([p6]);
          await expect(promiseService.findAll(cond(hx.id))).resolves.toBeArrayOfSize(0);

          await expect(promiseService.findOne(cond(h1.id))).rejects.toEqual(PromiseServiceError.NotFoundPromise);
          await expect(promiseService.findOne(cond(h2.id))).rejects.toEqual(PromiseServiceError.NotFoundPromise);
          await expect(promiseService.findOne(cond(h3.id))).resolves.toMatchObject(p3);
          await expect(promiseService.findOne(cond(h4.id))).resolves.toMatchObject(p4);
          await expect(promiseService.findOne(cond(h5.id))).rejects.toEqual(PromiseServiceError.NotFoundPromise);
          await expect(promiseService.findOne(cond(h6.id))).resolves.toMatchObject(p6);
          await expect(promiseService.findOne(cond(hx.id))).rejects.toEqual(PromiseServiceError.NotFoundPromise);
        } else if (role === PromiseUserRole.ATTENDEE) {
          await expect(promiseService.exists(cond(h1.id))).resolves.toBeTrue();
          await expect(promiseService.exists(cond(h2.id))).resolves.toBeFalse();
          await expect(promiseService.exists(cond(h3.id))).resolves.toBeFalse();
          await expect(promiseService.exists(cond(h4.id))).resolves.toBeTrue();
          await expect(promiseService.exists(cond(h5.id))).resolves.toBeTrue();
          await expect(promiseService.exists(cond(h6.id))).resolves.toBeFalse();
          await expect(promiseService.exists(cond(hx.id))).resolves.toBeFalse();

          await expect(promiseService.findAll(cond(h1.id))).resolves.toMatchObject([p6]);
          await expect(promiseService.findAll(cond(h2.id))).resolves.toBeArrayOfSize(0);
          await expect(promiseService.findAll(cond(h3.id))).resolves.toBeArrayOfSize(0);
          await expect(promiseService.findAll(cond(h4.id))).resolves.toMatchObject([p6]);
          await expect(promiseService.findAll(cond(h5.id))).resolves.toMatchObject([p4]);
          await expect(promiseService.findAll(cond(h6.id))).resolves.toBeArrayOfSize(0);
          await expect(promiseService.findAll(cond(hx.id))).resolves.toBeArrayOfSize(0);

          await expect(promiseService.findOne(cond(h1.id))).resolves.toMatchObject(p6);
          await expect(promiseService.findOne(cond(h2.id))).rejects.toEqual(PromiseServiceError.NotFoundPromise);
          await expect(promiseService.findOne(cond(h3.id))).rejects.toEqual(PromiseServiceError.NotFoundPromise);
          await expect(promiseService.findOne(cond(h4.id))).resolves.toMatchObject(p6);
          await expect(promiseService.findOne(cond(h5.id))).resolves.toMatchObject(p4);
          await expect(promiseService.findOne(cond(h6.id))).rejects.toEqual(PromiseServiceError.NotFoundPromise);
          await expect(promiseService.findOne(cond(hx.id))).rejects.toEqual(PromiseServiceError.NotFoundPromise);
        } else if (role === PromiseUserRole.ALL) {
          await expect(promiseService.exists(cond(h1.id))).resolves.toBeTrue();
          await expect(promiseService.exists(cond(h2.id))).resolves.toBeFalse();
          await expect(promiseService.exists(cond(h3.id))).resolves.toBeTrue();
          await expect(promiseService.exists(cond(h4.id))).resolves.toBeTrue();
          await expect(promiseService.exists(cond(h5.id))).resolves.toBeTrue();
          await expect(promiseService.exists(cond(h6.id))).resolves.toBeTrue();
          await expect(promiseService.exists(cond(hx.id))).resolves.toBeFalse();

          await expect(promiseService.findAll(cond(h1.id))).resolves.toMatchObject([p6]);
          await expect(promiseService.findAll(cond(h2.id))).resolves.toBeArrayOfSize(0);
          await expect(promiseService.findAll(cond(h3.id))).resolves.toMatchObject([p3]);
          await expect(promiseService.findAll(cond(h4.id))).resolves.toMatchObject([p4, p6]);
          await expect(promiseService.findAll(cond(h5.id))).resolves.toMatchObject([p4]);
          await expect(promiseService.findAll(cond(h6.id))).resolves.toMatchObject([p6]);
          await expect(promiseService.findAll(cond(hx.id))).resolves.toBeArrayOfSize(0);

          await expect(promiseService.findOne(cond(h1.id))).resolves.toMatchObject(p6);
          await expect(promiseService.findOne(cond(h2.id))).rejects.toEqual(PromiseServiceError.NotFoundPromise);
          await expect(promiseService.findOne(cond(h3.id))).resolves.toMatchObject(p3);
          await expect(promiseService.findOne(cond(h4.id))).resolves.toMatchObject(p4);
          await expect(promiseService.findOne(cond(h5.id))).resolves.toMatchObject(p4);
          await expect(promiseService.findOne(cond(h6.id))).resolves.toMatchObject(p6);
          await expect(promiseService.findOne(cond(hx.id))).rejects.toEqual(PromiseServiceError.NotFoundPromise);
        }
      } else if (status === PromiseStatus.ALL) {
        if (role === PromiseUserRole.HOST) {
          await expect(promiseService.exists(cond(h1.id))).resolves.toBeTrue();
          await expect(promiseService.exists(cond(h2.id))).resolves.toBeTrue();
          await expect(promiseService.exists(cond(h3.id))).resolves.toBeTrue();
          await expect(promiseService.exists(cond(h4.id))).resolves.toBeTrue();
          await expect(promiseService.exists(cond(h5.id))).resolves.toBeTrue();
          await expect(promiseService.exists(cond(h6.id))).resolves.toBeTrue();
          await expect(promiseService.exists(cond(hx.id))).resolves.toBeFalse();

          await expect(promiseService.findAll(cond(h1.id))).resolves.toMatchObject([p1]);
          await expect(promiseService.findAll(cond(h2.id))).resolves.toMatchObject([p2]);
          await expect(promiseService.findAll(cond(h3.id))).resolves.toMatchObject([p3]);
          await expect(promiseService.findAll(cond(h4.id))).resolves.toMatchObject([p4]);
          await expect(promiseService.findAll(cond(h5.id))).resolves.toMatchObject([p5]);
          await expect(promiseService.findAll(cond(h6.id))).resolves.toMatchObject([p6]);
          await expect(promiseService.findAll(cond(hx.id))).resolves.toBeArrayOfSize(0);

          await expect(promiseService.findOne(cond(h1.id))).resolves.toMatchObject(p1);
          await expect(promiseService.findOne(cond(h2.id))).resolves.toMatchObject(p2);
          await expect(promiseService.findOne(cond(h3.id))).resolves.toMatchObject(p3);
          await expect(promiseService.findOne(cond(h4.id))).resolves.toMatchObject(p4);
          await expect(promiseService.findOne(cond(h5.id))).resolves.toMatchObject(p5);
          await expect(promiseService.findOne(cond(h6.id))).resolves.toMatchObject(p6);
          await expect(promiseService.findOne(cond(hx.id))).rejects.toEqual(PromiseServiceError.NotFoundPromise);
        } else if (role === PromiseUserRole.ATTENDEE) {
          await expect(promiseService.exists(cond(h1.id))).resolves.toBeTrue();
          await expect(promiseService.exists(cond(h2.id))).resolves.toBeFalse();
          await expect(promiseService.exists(cond(h3.id))).resolves.toBeTrue();
          await expect(promiseService.exists(cond(h4.id))).resolves.toBeTrue();
          await expect(promiseService.exists(cond(h5.id))).resolves.toBeTrue();
          await expect(promiseService.exists(cond(h6.id))).resolves.toBeFalse();
          await expect(promiseService.exists(cond(hx.id))).resolves.toBeFalse();

          await expect(promiseService.findAll(cond(h1.id))).resolves.toMatchObject([p5, p6]);
          await expect(promiseService.findAll(cond(h2.id))).resolves.toBeArrayOfSize(0);
          await expect(promiseService.findAll(cond(h3.id))).resolves.toMatchObject([p2]);
          await expect(promiseService.findAll(cond(h4.id))).resolves.toMatchObject([p5, p6]);
          await expect(promiseService.findAll(cond(h5.id))).resolves.toMatchObject([p4]);
          await expect(promiseService.findAll(cond(h6.id))).resolves.toBeArrayOfSize(0);
          await expect(promiseService.findAll(cond(hx.id))).resolves.toBeArrayOfSize(0);

          await expect(promiseService.findOne(cond(h1.id))).resolves.toMatchObject(p5);
          await expect(promiseService.findOne(cond(h2.id))).rejects.toEqual(PromiseServiceError.NotFoundPromise);
          await expect(promiseService.findOne(cond(h3.id))).resolves.toMatchObject(p2);
          await expect(promiseService.findOne(cond(h4.id))).resolves.toMatchObject(p5);
          await expect(promiseService.findOne(cond(h5.id))).resolves.toMatchObject(p4);
          await expect(promiseService.findOne(cond(h6.id))).rejects.toEqual(PromiseServiceError.NotFoundPromise);
          await expect(promiseService.findOne(cond(hx.id))).rejects.toEqual(PromiseServiceError.NotFoundPromise);
        } else if (role === PromiseUserRole.ALL) {
          await expect(promiseService.exists(cond(h1.id))).resolves.toBeTrue();
          await expect(promiseService.exists(cond(h2.id))).resolves.toBeTrue();
          await expect(promiseService.exists(cond(h3.id))).resolves.toBeTrue();
          await expect(promiseService.exists(cond(h4.id))).resolves.toBeTrue();
          await expect(promiseService.exists(cond(h5.id))).resolves.toBeTrue();
          await expect(promiseService.exists(cond(h6.id))).resolves.toBeTrue();
          await expect(promiseService.exists(cond(hx.id))).resolves.toBeFalse();

          await expect(promiseService.findAll(cond(h1.id))).resolves.toMatchObject([p1, p5, p6]);
          await expect(promiseService.findAll(cond(h2.id))).resolves.toMatchObject([p2]);
          await expect(promiseService.findAll(cond(h3.id))).resolves.toMatchObject([p2, p3]);
          await expect(promiseService.findAll(cond(h4.id))).resolves.toMatchObject([p4, p5, p6]);
          await expect(promiseService.findAll(cond(h5.id))).resolves.toMatchObject([p4, p5]);
          await expect(promiseService.findAll(cond(h6.id))).resolves.toMatchObject([p6]);
          await expect(promiseService.findAll(cond(hx.id))).resolves.toBeArrayOfSize(0);

          await expect(promiseService.findOne(cond(h1.id))).resolves.toMatchObject(p1);
          await expect(promiseService.findOne(cond(h2.id))).resolves.toMatchObject(p2);
          await expect(promiseService.findOne(cond(h3.id))).resolves.toMatchObject(p2);
          await expect(promiseService.findOne(cond(h4.id))).resolves.toMatchObject(p4);
          await expect(promiseService.findOne(cond(h5.id))).resolves.toMatchObject(p4);
          await expect(promiseService.findOne(cond(h6.id))).resolves.toMatchObject(p6);
          await expect(promiseService.findOne(cond(hx.id))).rejects.toEqual(PromiseServiceError.NotFoundPromise);
        }
      }
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
      const { themes } = await fixture();
      await expect(promiseService.getThemes()).resolves.toMatchObject(
        themes.map(({ input: theme }) => ({ id: theme.id, name: expect.any(String) }))
      );
    });
  });
});
