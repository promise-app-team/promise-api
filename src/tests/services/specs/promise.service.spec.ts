import { Test } from '@nestjs/testing';
import { Promise as PromiseModel, User as UserModel } from '@prisma/client';
import { formatISO } from 'date-fns';
import * as R from 'remeda';

import {
  InputCreatePromiseDTO,
  InputLocationDTO,
  InputUpdatePromiseDTO,
  PromiseStatus,
  PromiseUserRole,
  PromiseService,
  PromiseServiceError,
} from '@/modules/promise';
import { DestinationType, PrismaService } from '@/prisma';
import { createTestFixture } from '@/tests/fixtures';
import { createPrismaClient } from '@/tests/setups/prisma';

describe(PromiseService, () => {
  let promiseService: PromiseService;
  const prisma = createPrismaClient({ logging: false });
  const fixture = createTestFixture(prisma, { from: 3e5, to: 4e5 });
  const { tomorrow, yesterday } = fixture.date;

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
    test('should return true if the promise exists by the id', async () => {
      const { promise } = await fixture.write.promise();
      await expect(promiseService.exists({ id: promise.input.id })).resolves.toBeTrue();
    });

    test('should return false if the promise does not exist by the id', async () => {
      await expect(promiseService.exists({ id: -1 })).resolves.toBeFalse();
    });
  });

  describe(PromiseService.prototype.findAll, () => {
    test('should return promises by the user', async () => {
      const host = await fixture.write.user.output();
      const { promise: p1 } = await fixture.write.promise.output({ host });
      const { promise: p2 } = await fixture.write.promise.output({ host });
      const { promise: p3 } = await fixture.write.promise.output({ host });

      const result = await promiseService.findAll({ role: PromiseUserRole.ALL, userId: host.id });

      const promises = [p1, p2, p3].map((p) => p);
      expect(result).toBeArrayOfSize(3);
      expect(result).toMatchObject(promises);
    });

    test('should return empty array if the user does not have any promises', async () => {
      await expect(promiseService.findAll({ role: PromiseUserRole.ALL, userId: -1 })).resolves.toBeArrayOfSize(0);
    });
  });

  describe(PromiseService.prototype.findOne, () => {
    test('should return a promise by the id', async () => {
      const { promise } = await fixture.write.promise.output();
      await expect(promiseService.findOne({ id: promise.id })).resolves.toMatchObject(promise);
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
      [fixture1, fixture2, fixture3, fixture4, fixture5, fixture6] = R.pipe(
        await Promise.all(
          R.times(6, async () => {
            const host = await fixture.write.user.output();
            const { promise } = await fixture.write.promise.output({ host, partial: { id: host.id } });
            return { host, promise };
          })
        ),
        R.sortBy(({ promise }) => promise.id)
      );
    });

    beforeEach(async () => {
      const [h1, _h2, h3, h4, h5, _h6] = hosts();
      const [p1, p2, p3, p4, p5, p6] = promises();

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
          prisma.promise.update({ where: { id: p5.id }, data: { promisedAt: tomorrow, completedAt: null } }),
          prisma.promise.update({ where: { id: p6.id }, data: { promisedAt: tomorrow, completedAt: yesterday } }),
        ]);

      await Promise.all([
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
      const hx = await fixture.write.user.output();
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
        const hx = await fixture.write.user.output();
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
      const hx = await fixture.write.user.output();

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
      const host = await fixture.write.user.output();
      const promiseInput = {
        ...fixture.input.promise({ hostId: host.id }),
        themeIds: [],
        destination: null,
        promisedAt: formatISO(tomorrow),
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
      const host = await fixture.write.user.output();
      const themes = (await fixture.write.themes.output(3)).map((theme) => theme);
      const promiseInput = {
        ...fixture.input.promise({ hostId: host.id }),
        themeIds: themes.map((theme) => theme.id),
        destination: null,
        promisedAt: tomorrow,
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
      const host = await fixture.write.user.output();

      const destination = {
        ...fixture.input.location(),
        latitude: 37.0,
        longitude: 127.0,
      } satisfies InputLocationDTO;

      const promiseInput = {
        ...fixture.input.promise({ hostId: host.id }),
        themeIds: [],
        destination,
        promisedAt: tomorrow,
      } satisfies InputCreatePromiseDTO;
      const result = await promiseService.create(host.id, promiseInput);

      expect(result).toMatchObject({
        ...R.omit(promiseInput, ['id', 'themeIds', 'destination']),
        destination: {
          ...destination,
          latitude: expect.toBeDecimalLike(destination.latitude),
          longitude: expect.toBeDecimalLike(destination.longitude),
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
      const { host, promise } = await fixture.write.promise();

      const updatedPromiseInput = {
        ...promise.input,
        title: 'updated title',
        destinationType: DestinationType.DYNAMIC,
        themeIds: [],
        destination: null,
        promisedAt: tomorrow,
      } satisfies InputUpdatePromiseDTO;

      const result = await promiseService.update(promise.input.id, host.input.id, updatedPromiseInput);

      expect(result).toMatchObject({
        ...R.omit(updatedPromiseInput, ['themeIds']),
        id: promise.input.id,
        promisedAt: new Date(updatedPromiseInput.promisedAt),
        updatedAt: expect.any(Date),
      });
    });

    test('should update a promise with themes', async () => {
      const { host, promise, themes } = await fixture.write.promise({ themes: 3 });
      const newThemes = (await fixture.write.themes(3)).map((theme) => theme.output);
      const updatedThemes = [...themes.map((t) => t.output).slice(1), ...newThemes.slice(1)];

      const updatedPromiseInput = {
        ...promise.input,
        title: 'updated title',
        destinationType: DestinationType.DYNAMIC,
        themeIds: updatedThemes.map((theme) => theme.id),
        destination: null,
        promisedAt: tomorrow,
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
      const { host, promise } = await fixture.write.promise({ destination: true });

      const updatedDestination = {
        ...fixture.input.location(),
        latitude: 37.0,
        longitude: 127.0,
      } satisfies InputLocationDTO;

      const updatedPromiseInput = {
        ...promise.input,
        title: 'updated title',
        destinationType: DestinationType.DYNAMIC,
        themeIds: [],
        destination: updatedDestination,
        promisedAt: tomorrow,
      } satisfies InputUpdatePromiseDTO;

      const result = await promiseService.update(promise.input.id, host.input.id, updatedPromiseInput);

      expect(result).toMatchObject({
        ...R.omit(updatedPromiseInput, ['themeIds', 'destination']),
        destination: {
          ...updatedDestination,
          latitude: expect.toBeDecimalLike(updatedDestination.latitude),
          longitude: expect.toBeDecimalLike(updatedDestination.longitude),
          updatedAt: expect.any(Date),
        },
        destinationId: expect.any(Number),
        isLatestDestination: true,
        promisedAt: new Date(updatedPromiseInput.promisedAt),
        updatedAt: expect.any(Date),
      });
    });

    test('should throw an error if the attendees try to update the promise', async () => {
      const { promise } = await fixture.write.promise.output();
      await expect(promiseService.update(promise.id, -1, {} as any)).rejects.toEqual(
        PromiseServiceError.OnlyHostUpdatable
      );
    });

    test('should throw an error if the promise does not exist', async () => {
      await expect(promiseService.update(0, 0, {} as any)).rejects.toEqual(PromiseServiceError.NotFoundPromise);
    });
  });

  describe(PromiseService.prototype.getStartLocation, () => {
    test('should return a start location by the promise id (host)', async () => {
      const { promise, host, hostStartLocation } = await fixture.write.promise.output({ hostStartLocation: true });
      await expect(promiseService.getStartLocation(promise.id, host.id)).resolves.toMatchObject(hostStartLocation);
    });

    test('should return a start location by the promise id (attendee)', async () => {
      const { promise, attendee, startLocation } = await fixture.write.promise.output({
        attendee: true,
        startLocation: true,
      });

      await expect(promiseService.getStartLocation(promise.id, attendee.id)).resolves.toMatchObject(startLocation);
    });

    test('should throw an error if the promise does not exist', async () => {
      await expect(promiseService.getStartLocation(0, 0)).rejects.toEqual(PromiseServiceError.NotFoundPromise);
    });

    test('should throw an error if the user is not attending the promise', async () => {
      const { promise } = await fixture.write.promise.output();
      await expect(promiseService.getStartLocation(promise.id, -1)).rejects.toEqual(
        PromiseServiceError.NotFoundPromise
      );
    });

    test('should throw an error if the user does not have a start location', async () => {
      const { host, promise } = await fixture.write.promise.output();
      await expect(promiseService.getStartLocation(promise.id, host.id)).rejects.toEqual(
        PromiseServiceError.NotFoundStartLocation
      );
    });
  });

  describe(PromiseService.prototype.updateStartLocation, () => {
    test('should create a start location by the promise id (host)', async () => {
      const { host, promise } = await fixture.write.promise.output();

      await expect(promiseService.getStartLocation(promise.id, host.id)).rejects.toEqual(
        PromiseServiceError.NotFoundStartLocation
      );

      const startLocation = fixture.input.location();
      const result = await promiseService.updateStartLocation(promise.id, host.id, startLocation);
      expect(result).toMatchObject({
        ...R.pick(startLocation, ['city', 'district', 'address']),
        latitude: expect.toBeDecimalLike(startLocation.latitude),
        longitude: expect.toBeDecimalLike(startLocation.longitude),
      });
    });

    test('should create a start location by the promise id (attendee)', async () => {
      const { promise, attendee } = await fixture.write.promise.output({ attendee: true });

      await expect(promiseService.getStartLocation(promise.id, attendee.id)).rejects.toEqual(
        PromiseServiceError.NotFoundStartLocation
      );

      const startLocation = fixture.input.location();
      const result = await promiseService.updateStartLocation(promise.id, attendee.id, startLocation);
      expect(result).toMatchObject({
        ...R.pick(startLocation, ['city', 'district', 'address']),
        latitude: expect.toBeDecimalLike(startLocation.latitude),
        longitude: expect.toBeDecimalLike(startLocation.longitude),
      });
    });

    test('should update a start location by the promise id (host)', async () => {
      const { host, promise } = await fixture.write.promise.output();
      const startLocation = fixture.input.location();
      await expect(promiseService.updateStartLocation(promise.id, host.id, startLocation)).resolves.toMatchObject({
        ...R.pick(startLocation, ['city', 'district', 'address']),
        latitude: expect.toBeDecimalLike(startLocation.latitude),
        longitude: expect.toBeDecimalLike(startLocation.longitude),
      });
    });

    test('should update a start location by the promise id (attendee)', async () => {
      const { promise, attendee } = await fixture.write.promise.output({
        attendee: true,
        startLocation: true,
      });
      const input = fixture.input.location();
      await expect(promiseService.updateStartLocation(promise.id, attendee.id, input)).resolves.toMatchObject({
        ...R.pick(input, ['city', 'district', 'address']),
        latitude: expect.toBeDecimalLike(input.latitude),
        longitude: expect.toBeDecimalLike(input.longitude),
      });
    });

    test('should throw an error if the promise does not exist', async () => {
      await expect(promiseService.updateStartLocation(0, 0, {} as any)).rejects.toEqual(
        PromiseServiceError.NotFoundPromise
      );
    });

    test('should throw an error if the user is not attending the promise', async () => {
      const { promise } = await fixture.write.promise.output();
      const input = fixture.input.location();
      await expect(promiseService.updateStartLocation(promise.id, -1, input)).rejects.toEqual(
        PromiseServiceError.NotFoundPromise
      );
    });
  });

  describe(PromiseService.prototype.deleteStartLocation, () => {
    test('should delete a start location by the promise id', async () => {
      const { promise, attendees, startLocations } = await fixture.write.promise.output({
        attendees: 1,
        startLocations: 1,
      });
      await expect(promiseService.deleteStartLocation(promise.id, attendees[0].id)).resolves.toMatchObject({
        id: startLocations[0].id,
      });
      await expect(promiseService.getStartLocation(promise.id, attendees[0].id)).rejects.toEqual(
        PromiseServiceError.NotFoundStartLocation
      );
    });

    test('should throw an error if the promise does not exist', async () => {
      await expect(promiseService.deleteStartLocation(0, 0)).rejects.toEqual(PromiseServiceError.NotFoundPromise);
    });

    test('should throw an error if the user is not attending the promise', async () => {
      const { promise } = await fixture.write.promise.output();
      await expect(promiseService.deleteStartLocation(promise.id, -1)).rejects.toEqual(
        PromiseServiceError.NotFoundPromise
      );
    });

    test('should throw an error if the user does not have a start location', async () => {
      const { host, promise } = await fixture.write.promise.output();
      await expect(promiseService.deleteStartLocation(promise.id, host.id)).rejects.toEqual(
        PromiseServiceError.NotFoundStartLocation
      );
    });
  });

  describe(PromiseService.prototype.attend, () => {
    test('should attend a promise by the user', async () => {
      const { host, promise, attendee } = await fixture.write.promise.output({ attendee: true });
      const newAttendee = await fixture.write.user.output();
      await expect(promiseService.attend(promise.id, newAttendee.id)).resolves.toMatchObject({
        id: promise.id,
      });
      const users = [host, attendee, newAttendee].map((attendee) => attendee);
      await expect(promiseService.findOne({ id: promise.id })).resolves.toMatchObject({
        ...promise,
        users: users.map((user) => ({ user })),
      });
    });

    test('should throw an error if the promise does not exist', async () => {
      await expect(promiseService.attend(0, 0)).rejects.toEqual(PromiseServiceError.NotFoundPromise);
    });

    test('should throw an error if the user is already attending the promise', async () => {
      const { promise, attendee } = await fixture.write.promise.output({ attendee: true });
      await expect(promiseService.attend(promise.id, attendee.id)).rejects.toEqual(PromiseServiceError.AlreadyAttended);
    });

    test('should throw an error if the promise is unavailable', async () => {
      const { promise } = await fixture.write.promise.output({ partial: { promisedAt: new Date(yesterday) } });
      const attendee = await fixture.write.user.output();
      await expect(promiseService.attend(promise.id, attendee.id)).rejects.toEqual(PromiseServiceError.NotFoundPromise);
    });

    test('should throw an error if the promise is completed', async () => {
      const { promise } = await fixture.write.promise.output({ partial: { completedAt: new Date() } });
      const attendee = await fixture.write.user.output();
      await expect(promiseService.attend(promise.id, attendee.id)).rejects.toEqual(PromiseServiceError.NotFoundPromise);
    });

    test('should throw an error when occurred an unexpected error', async () => {
      await expect(promiseService.attend(undefined as any, undefined as any)).rejects.toThrow();
    });
  });

  describe(PromiseService.prototype.leave, () => {
    test('should leave a promise by the user', async () => {
      const { host, promise, attendees } = await fixture.write.promise.output({ attendees: 2 });
      const [attendee1, attendee2] = attendees.map((attendee) => attendee);
      await expect(promiseService.leave(promise.id, attendee1.id)).resolves.toEqual({
        id: promise.id,
      });
      await expect(promiseService.findOne({ id: promise.id })).resolves.toMatchObject({
        ...promise,
        users: [{ user: host }, { user: attendee2 }],
      });
    });

    test('should throw an error if the promise does not exist', async () => {
      await expect(promiseService.leave(0, 0)).rejects.toEqual(PromiseServiceError.NotFoundPromise);
    });

    test('should throw an error if the user is not attending the promise', async () => {
      const { promise } = await fixture.write.promise.output();
      await expect(promiseService.leave(promise.id, -1)).rejects.toEqual(PromiseServiceError.NotFoundPromise);
    });

    test('should throw an error if the user is the host of the promise', async () => {
      const { host, promise } = await fixture.write.promise.output();
      await expect(promiseService.leave(promise.id, host.id)).rejects.toEqual(PromiseServiceError.HostCannotLeave);
    });

    test('should throw an error if the promise is unavailable', async () => {
      const { promise, attendee } = await fixture.write.promise.output({
        attendee: true,
        partial: { promisedAt: new Date(yesterday) },
      });
      await expect(promiseService.leave(promise.id, attendee.id)).rejects.toEqual(PromiseServiceError.NotFoundPromise);
    });

    test('should throw an error if the promise is completed', async () => {
      const { promise, attendee } = await fixture.write.promise.output({
        attendee: true,
        partial: { completedAt: new Date() },
      });
      await expect(promiseService.leave(promise.id, attendee.id)).rejects.toEqual(PromiseServiceError.NotFoundPromise);
    });

    test('should throw an error when occurred an unexpected error', async () => {
      await expect(promiseService.leave('unknown' as any, 'unknown' as any)).rejects.toThrow();
    });
  });

  describe(PromiseService.prototype.delegate, () => {
    test('should delegate a host of promise by the attendee', async () => {
      const { host, promise, attendee } = await fixture.write.promise.output({ attendee: true });
      await expect(promiseService.delegate(promise.id, host.id, attendee.id)).resolves.toEqual({
        id: promise.id,
      });
      await expect(promiseService.findOne({ id: promise.id })).resolves.toMatchObject({
        host: { id: attendee.id },
      });
    });

    test('should throw an error if the promise does not exist', async () => {
      await expect(promiseService.delegate(0, 0, 0)).rejects.toEqual(PromiseServiceError.NotFoundPromise);
    });

    test('should throw an error if the host is not the host of the promise', async () => {
      const { promise, attendee } = await fixture.write.promise.output({ attendee: true });
      await expect(promiseService.delegate(promise.id, -1, attendee.id)).rejects.toEqual(
        PromiseServiceError.NotFoundPromise
      );
    });

    test('should throw an error if the user is not attending the promise', async () => {
      const { promise, host } = await fixture.write.promise.output();
      await expect(promiseService.delegate(promise.id, host.id, -1)).rejects.toEqual(
        PromiseServiceError.NotFoundPromise
      );
    });

    test('should throw an error if the attendee tries to delegate the host', async () => {
      const { host, promise, attendee } = await fixture.write.promise.output({ attendee: true });
      await expect(promiseService.delegate(promise.id, attendee.id, host.id)).rejects.toEqual(
        PromiseServiceError.NotFoundPromise
      );
    });

    test('should throw an error if the promise is unavailable', async () => {
      const { promise, attendee } = await fixture.write.promise.output({
        attendee: true,
        partial: { promisedAt: new Date(yesterday) },
      });
      await expect(promiseService.delegate(promise.id, attendee.id, attendee.id)).rejects.toEqual(
        PromiseServiceError.NotFoundPromise
      );
    });

    test('should throw an error if the promise is completed', async () => {
      const { promise, attendee } = await fixture.write.promise.output({
        attendee: true,
        partial: { completedAt: new Date() },
      });
      await expect(promiseService.delegate(promise.id, attendee.id, attendee.id)).rejects.toEqual(
        PromiseServiceError.NotFoundPromise
      );
    });

    test('should throw an error when occurred an unexpected error', async () => {
      await expect(promiseService.delegate('unknown' as any, 'unknown' as any, 'unknown' as any)).rejects.toThrow();
    });
  });

  describe(PromiseService.prototype.complete, () => {
    test('should complete a promise by the host', async () => {
      const { host, promise } = await fixture.write.promise.output();
      await expect(promiseService.complete(promise.id, host.id)).resolves.toEqual({
        id: promise.id,
      });
      await expect(promiseService.findOne({ id: promise.id })).resolves.toMatchObject({
        completedAt: expect.any(Date),
      });
    });

    test('should throw an error if the promise does not exist', async () => {
      await expect(promiseService.complete(0, 0)).rejects.toEqual(PromiseServiceError.NotFoundPromise);
    });

    test('should throw an error if the user is not the host of the promise', async () => {
      const { promise, attendee } = await fixture.write.promise.output({ attendee: true });
      await expect(promiseService.complete(promise.id, attendee.id)).rejects.toEqual(
        PromiseServiceError.NotFoundPromise
      );
    });

    test('should throw an error if the promise is unavailable', async () => {
      const { promise, host } = await fixture.write.promise.output({ partial: { promisedAt: new Date(yesterday) } });
      await expect(promiseService.complete(promise.id, host.id)).rejects.toEqual(PromiseServiceError.NotFoundPromise);
    });

    test('should throw an error if the promise is already completed', async () => {
      const { promise, host } = await fixture.write.promise.output({ partial: { completedAt: new Date() } });
      await expect(promiseService.complete(promise.id, host.id)).rejects.toEqual(PromiseServiceError.NotFoundPromise);
    });

    test('should throw an error when occurred an unexpected error', async () => {
      await expect(promiseService.complete('unknown' as any, 'unknown' as any)).rejects.toThrow();
    });
  });

  describe(PromiseService.prototype.getAttendees, () => {
    test('should return attendees by the promise id', async () => {
      const { host, promise, attendees } = await fixture.write.promise.output({ attendees: 3 });
      const result = await promiseService.getAttendees(promise.id);
      const users = [host, ...attendees.map((attendee) => attendee)];
      expect(result).toHaveLength(4);
      expect(result).toMatchObject(users.map((user) => ({ userId: user.id })));
    });

    test('should return attendees by the promise id and the user ids', async () => {
      const { host, promise, attendees } = await fixture.write.promise.output({ attendees: 3 });
      const userIds = [host.id, attendees[0].id];
      const result = await promiseService.getAttendees(promise.id, userIds);
      expect(result).toHaveLength(2);
      expect(result).toMatchObject(userIds.map((userId) => ({ userId })));
    });
  });

  describe(PromiseService.prototype.getThemes, () => {
    test('should return themes by the promise id', async () => {
      const theme1 = await fixture.write.theme.output();
      const theme2 = await fixture.write.theme.output();
      const theme3 = await fixture.write.theme.output();

      const themes = [theme1, theme2, theme3];
      await expect(promiseService.getThemes()).resolves.toMatchObject(
        themes.map((theme) => ({ id: theme.id, name: expect.any(String) }))
      );
    });
  });
});
