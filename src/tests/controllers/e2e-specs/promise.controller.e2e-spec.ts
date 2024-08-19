import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { addMinutes } from 'date-fns';
import * as R from 'remeda';

import { AppModule } from '@/app';
import { IntHashService } from '@/customs/inthash';
import { configure } from '@/main';
import { JwtAuthTokenService } from '@/modules/auth';
import { PromiseController } from '@/modules/promise';
import { DestinationType, LocationShareType } from '@/prisma';
import { createHttpRequest } from '@/tests/controllers/utils/http-request';
import { createTestFixture } from '@/tests/fixtures';
import { createPrismaClient } from '@/tests/setups/prisma';

import { mockGlobalFn } from '../mocks';

import type { InputLocationDTO } from '@/modules/location';
import type { InputCreatePromiseDTO, InputUpdatePromiseDTO } from '@/modules/promise';
import type { NestExpressApplication } from '@nestjs/platform-express';

describe(PromiseController, () => {
  const prisma = createPrismaClient({ logging: false });
  const fixture = createTestFixture(prisma, { from: 4e7, to: 5e7 });
  const http = createHttpRequest<PromiseController>('promises', {
    getMyPromises: '',
    getPromise: ':pid(\\d+)',
    createPromise: '',
    updatePromise: ':pid(\\d+)',
    attendPromise: ':pid(\\d+)/attendees',
    leavePromise: ':pid(\\d+)/attendees',
    delegatePromise: ':pid(\\d+)/delegate',
    completePromise: ':pid(\\d+)/complete',
    getStartLocation: ':pid(\\d+)/start-location',
    updateStartLocation: ':pid(\\d+)/start-location',
    deleteStartLocation: ':pid(\\d+)/start-location',
    getMiddleLocation: ':pid(\\d+)/middle-location',
    dequeuePromise: 'queue',
    enqueuePromise: 'queue',
  });

  const { tomorrow, yesterday } = fixture.date;

  let hasher: IntHashService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = module.createNestApplication<NestExpressApplication>();
    http.prepare(await configure(app).then((app) => app.init()));

    const authUser = await fixture.write.user.output();
    http.request.authorize(authUser, { jwt: module.get(JwtAuthTokenService) });
    fixture.configure({ authUser });
    hasher = module.get(IntHashService);
  });

  function toPromiseDTO({
    host,
    promise,
    destination,
    attendees,
    themes,
  }: {
    host: any;
    promise: any;
    destination: any;
    attendees: any;
    themes: any[];
  }) {
    return {
      pid: expect.toBeString(),
      title: promise.title,
      destinationType: promise.destinationType,
      isLatestDestination: promise.isLatestDestination,
      locationShareStartType: promise.locationShareStartType,
      locationShareStartValue: promise.locationShareStartValue,
      locationShareEndType: promise.locationShareEndType,
      locationShareEndValue: promise.locationShareEndValue,
      promisedAt: expect.toBeISO8601(),
      completedAt: promise.completedAt ? new Date(promise.completedAt) : null,
      createdAt: expect.toBeISO8601(),
      host: R.pick(host, ['id', 'username', 'profileUrl']),
      themes: expect.toIncludeSameMembers(themes),
      destination: destination
        ? {
            ...R.pick(destination, ['id', 'name', 'city', 'district', 'address1', 'address2']),
            latitude: expect.toBeDecimalLike(destination.latitude),
            longitude: expect.toBeDecimalLike(destination.longitude),
          }
        : null,
      attendees: expect.toIncludeSameMembers(
        R.pipe(
          [host, ...attendees],
          R.sortBy((attendee) => attendee.id),
          R.map((attendee, i) => ({
            ...R.pick(attendee, ['id', 'username', 'profileUrl']),
            hasStartLocation: i === 1,
            isMidpointCalculated: expect.toBeBoolean(),
            attendedAt: expect.toBeISO8601(),
            leavedAt: null,
          }))
        )
      ),
    };
    // satisfies Omit<PromiseDTO, 'id'>;
  }

  describe(http.request.getMyPromises, () => {
    test('should return promises', async () => {
      const assets = await Promise.all(
        R.times(3, () =>
          fixture.write.promise.output({
            host: http.request.auth.user,
            destination: true,
            attendees: 3,
            themes: 3,
            startLocations: 1,
          })
        )
      );

      const res = await http.request.getMyPromises().get.expect(200);

      expect(res.body).toIncludeSameMembers(assets.map((asset) => toPromiseDTO(asset)));
    });
  });

  describe(http.request.getPromise, () => {
    test('should return promise', async () => {
      const asset = await fixture.write.promise.output({
        destination: true,
        attendees: 3,
        startLocations: 1,
        themes: 3,
      });

      const pid = hasher.encode(asset.promise.id);
      const res = await http.request.getPromise({ pid }).get.expect(200);

      expect(res.body).toEqual(toPromiseDTO(asset));
    });

    test('should return 404 if promise not found', async () => {
      const pid = hasher.encode(0);
      await http.request.getPromise({ pid }).get.expect(404);
    });
  });

  describe(http.request.createPromise, () => {
    test('should create a promise', async () => {
      const themes = await fixture.write.themes.output(3);
      const destination = fixture.input.location();
      const promise = fixture.input.promise({
        hostId: http.request.auth.user.id,
      });

      const input = {
        ...R.pick(promise, [
          'title',
          'destinationType',
          'locationShareStartType',
          'locationShareStartValue',
          'locationShareEndType',
          'locationShareEndValue',
        ]),
        destination,
        promisedAt: tomorrow,
        themeIds: themes.map((theme) => theme.id),
      } satisfies InputCreatePromiseDTO;

      const res = await http.request.createPromise().post.send(input).expect(201);

      destination.id = res.body.destination.id;
      expect(res.body).toEqual(
        toPromiseDTO({ host: http.request.auth.user, promise, destination, attendees: [], themes })
      );
    });

    test('should throw an error if title is empty', async () => {
      await http.request.createPromise().post.send({ title: '' }).expect(400);
    });

    test('should throw an error if promisedAt is in the past', async () => {
      const themes = await fixture.write.themes.output(3);
      const destination = fixture.input.location();
      const promise = fixture.input.promise({
        hostId: http.request.auth.user.id,
      });

      const input = {
        ...R.pick(promise, [
          'title',
          'destinationType',
          'locationShareStartType',
          'locationShareStartValue',
          'locationShareEndType',
          'locationShareEndValue',
        ]),
        destination,
        promisedAt: yesterday,
        themeIds: themes.map((theme) => theme.id),
      } satisfies InputCreatePromiseDTO;

      await http.request.createPromise().post.send(input).expect(400);
    });

    test('should throw an error if promisedAt is in after 10 minutes', async () => {
      const themes = await fixture.write.themes.output(3);
      const destination = fixture.input.location();
      const promise = fixture.input.promise({
        hostId: http.request.auth.user.id,
      });

      const input = {
        ...R.pick(promise, [
          'title',
          'destinationType',
          'locationShareStartType',
          'locationShareStartValue',
          'locationShareEndType',
          'locationShareEndValue',
        ]),
        destination,
        promisedAt: addMinutes(new Date(), 9).toISOString(),
        themeIds: themes.map((theme) => theme.id),
      } satisfies InputCreatePromiseDTO;

      const res = await http.request.createPromise().post.send(input);
      expect(res.body.statusCode).toBe(400);
      expect(res.body.message).toBe('약속 시간은 현재 시간보다 10분 이후로 입력해주세요.');
    });
  });

  describe(http.request.updatePromise, () => {
    const input = {
      title: 'updated title',
      destinationType: DestinationType.STATIC,
      locationShareStartType: LocationShareType.DISTANCE,
      locationShareStartValue: 1000,
      locationShareEndType: LocationShareType.TIME,
      locationShareEndValue: 60,
      destination: {
        name: R.randomString(5),
        city: R.randomString(5),
        district: R.randomString(5),
        address1: R.randomString(5),
        address2: R.randomString(5),
        latitude: 37.5665,
        longitude: 127.0365,
      },
      themeIds: [],
      promisedAt: tomorrow,
    } satisfies InputUpdatePromiseDTO;

    test('should update a promise', async () => {
      const themes = await fixture.write.themes.output(3);
      const asset = await fixture.write.promise.output({
        host: http.request.auth.user,
        destination: true,
        attendees: 3,
        startLocations: 1,
        themes: 3,
      });

      const pid = hasher.encode(asset.promise.id);
      const res = await http.request
        .updatePromise({ pid })
        .put.send({
          ...input,
          themeIds: themes.map((theme) => theme.id),
        })
        .expect(200);

      Object.assign(asset.promise, input);
      Object.assign(asset.destination, input.destination);
      asset.promise.isLatestDestination = true;
      expect(res.body).toEqual(toPromiseDTO({ ...asset, themes }));
    });

    test('should update isLatestDestination if destination is updated', async () => {
      const { promise } = await fixture.write.promise.output({
        host: http.request.auth.user,
        attendees: 3,
        startLocations: 3,
        partial: {
          destinationType: DestinationType.DYNAMIC,
          isLatestDestination: false,
        },
      });

      const pid = hasher.encode(promise.id);

      {
        const res = await http.request
          .updatePromise({ pid })
          .put.send({ ...input })
          .expect(200);

        expect(res.body.isLatestDestination).toBeTrue();
      }

      {
        const res = await http.request
          .updatePromise({ pid })
          .put.send({ ...input, destination: null })
          .expect(200);

        expect(res.body.isLatestDestination).toBeFalse();
      }
    });

    test(`should update isMidpointCalculated to true by attendee if destinationTpe is ${DestinationType.DYNAMIC}`, async () => {
      const { host, promise, attendees } = await fixture.write.promise.output({
        host: http.request.auth.user,
        attendees: 3,
        startLocations: 3,
        partial: {
          destinationType: DestinationType.DYNAMIC,
        },
      });

      const pid = hasher.encode(promise.id);

      const res = await http.request
        .getMiddleLocation({ pid })
        .get.query({
          attendeeIds: [attendees[0].id, attendees[2].id],
        })
        .expect(200);

      const ref = res.body.ref;

      {
        const res = await http.request
          .updatePromise({ pid })
          .put.send({
            ...input,
            destinationType: DestinationType.DYNAMIC,
            middleLocationRef: ref,
          })
          .expect(200);

        expect(res.body.attendees).toIncludeSameMembers(
          (
            [
              [host, false],
              [attendees[0], true],
              [attendees[1], false],
              [attendees[2], true],
            ] as const
          ).map(([attendee, isMidpointCalculated]) => ({
            ...R.pick(attendee, ['id', 'username', 'profileUrl']),
            isMidpointCalculated,
            attendedAt: expect.toBeISO8601(),
            hasStartLocation: expect.toBeBoolean(),
            leavedAt: null,
          }))
        );
      }
    });

    test(`should reset isMidpointCalculated to false by attendee if destinationType is changed to ${DestinationType.STATIC}`, async () => {
      const { host, promise, attendees } = await fixture.write.promise.output({
        host: http.request.auth.user,
        attendees: 3,
        startLocations: 3,
        partial: {
          destinationType: DestinationType.DYNAMIC,
        },
      });

      const pid = hasher.encode(promise.id);

      const res = await http.request
        .getMiddleLocation({ pid })
        .get.query({
          attendeeIds: [attendees[0].id, attendees[2].id],
        })
        .expect(200);

      const ref = res.body.ref;

      await http.request
        .updatePromise({ pid })
        .put.send({ ...input, destinationType: DestinationType.DYNAMIC, middleLocationRef: ref })
        .expect(200);

      {
        const res = await http.request
          .updatePromise({ pid })
          .put.send({ ...input, destinationType: DestinationType.STATIC })
          .expect(200);

        expect(res.body.attendees).toIncludeSameMembers(
          [host, ...attendees].map((attendee) => ({
            ...R.pick(attendee, ['id', 'username', 'profileUrl']),
            isMidpointCalculated: false,
            attendedAt: expect.toBeISO8601(),
            hasStartLocation: expect.toBeBoolean(),
            leavedAt: null,
          }))
        );
      }
    });

    test(`should throw an error if middleLocationRef is empty when destinationType is ${DestinationType.DYNAMIC}`, async () => {
      const { promise } = await fixture.write.promise.output({
        host: http.request.auth.user,
        attendees: 3,
        startLocations: 3,
        partial: {
          destinationType: DestinationType.DYNAMIC,
        },
      });

      const pid = hasher.encode(promise.id);

      await http.request
        .updatePromise({ pid })
        .put.send({ ...input, destinationType: DestinationType.STATIC })
        .expect(200);

      await http.request
        .updatePromise({ pid })
        .put.send({ ...input, destinationType: DestinationType.DYNAMIC })
        .expect(400);
    });

    test('should throw an error if promise not found', async () => {
      const pid = hasher.encode(0);
      await http.request.updatePromise({ pid }).put.send(input).expect(404);
    });

    test('should throw an error if not host', async () => {
      const { promise } = await fixture.write.promise.output();

      const pid = hasher.encode(promise.id);
      await http.request.updatePromise({ pid }).put.send(input).expect(403);
    });
  });

  describe(http.request.attendPromise, () => {
    test('should attend a promise', async () => {
      const { promise } = await fixture.write.promise.output();

      const pid = hasher.encode(promise.id);
      const res = await http.request.attendPromise({ pid }).post.expect(201);

      expect(res.body).toEqual({ pid });
    });

    test('should throw an error if already attended', async () => {
      const { promise } = await fixture.write.promise.output();

      const pid = hasher.encode(promise.id);
      await http.request.attendPromise({ pid }).post.expect(201);
      await http.request.attendPromise({ pid }).post.expect(400);
    });

    test('should throw an error if promise not found', async () => {
      const pid = hasher.encode(0);
      await http.request.attendPromise({ pid }).post.expect(404);
    });

    test('should throw an error if promisedAt is in the past', async () => {
      const { promise } = await fixture.write.promise.output({
        partial: {
          promisedAt: new Date(yesterday),
        },
      });

      const pid = hasher.encode(promise.id);
      await http.request.attendPromise({ pid }).post.expect(404);
    });

    test('should throw an error if already completed', async () => {
      const { promise } = await fixture.write.promise.output({
        partial: {
          completedAt: new Date(yesterday),
        },
      });

      const pid = hasher.encode(promise.id);
      await http.request.attendPromise({ pid }).post.expect(404);
    });
  });

  describe(http.request.leavePromise, () => {
    test('should leave a promise', async () => {
      const { promise } = await fixture.write.promise.output();

      const pid = hasher.encode(promise.id);
      {
        await http.request.attendPromise({ pid }).post.expect(201);
        const res = await http.request.getPromise({ pid }).get.expect(200);
        expect(res.body.attendees[0]).toMatchObject({
          id: http.request.auth.user.id,
          attendedAt: expect.toBeISO8601(),
          leavedAt: null,
        });
      }

      {
        await http.request.leavePromise({ pid }).delete.expect(200);
        const res = await http.request.getPromise({ pid }).get.expect(200);
        expect(res.body.attendees[0]).toMatchObject({
          id: http.request.auth.user.id,
          leavedAt: expect.toBeISO8601(),
        });
      }
    });

    test('should throw an error if not attended', async () => {
      const { promise } = await fixture.write.promise.output();

      const pid = hasher.encode(promise.id);
      await http.request.leavePromise({ pid }).delete.expect(404);
    });

    test('should throw an error if promisedAt is in the past', async () => {
      const { promise } = await fixture.write.promise.output({
        partial: {
          promisedAt: new Date(yesterday),
        },
      });

      const pid = hasher.encode(promise.id);
      await http.request.attendPromise({ pid }).post.expect(404);
    });

    test('should throw an error if already completed', async () => {
      const { promise } = await fixture.write.promise.output({
        partial: {
          completedAt: new Date(yesterday),
        },
      });

      const pid = hasher.encode(promise.id);
      await http.request.attendPromise({ pid }).post.expect(404);
    });

    test('should throw an error if the user is host', async () => {
      const { promise } = await fixture.write.promise.output({
        host: http.request.auth.user,
      });

      const pid = hasher.encode(promise.id);
      await http.request.leavePromise({ pid }).delete.expect(400);
    });

    test('should throw an error if promise not found', async () => {
      const pid = hasher.encode(0);
      await http.request.leavePromise({ pid }).delete.expect(404);
    });
  });

  describe(http.request.delegatePromise, () => {
    test('should delegate a host to another attendee', async () => {
      const { promise, attendee } = await fixture.write.promise.output({
        host: http.request.auth.user,
        attendee: true,
      });

      const pid = hasher.encode(promise.id);

      {
        const res = await http.request.delegatePromise({ pid }).put.query({ attendeeId: attendee.id }).expect(200);
        expect(res.body).toEqual({ pid });
      }

      {
        const res = await http.request.getPromise({ pid }).get.expect(200);
        expect(res.body.host.id).toBe(attendee.id);
      }
    });

    test('should throw an error if not host', async () => {
      const { promise, attendee } = await fixture.write.promise.output({ attendee: true });

      const pid = hasher.encode(promise.id);

      {
        const res = await http.request.getPromise({ pid }).get.expect(200);
        expect(res.body.host.id).not.toBe(http.request.auth.user.id);
      }

      await http.request.delegatePromise({ pid }).put.query({ attendeeId: attendee.id }).expect(404);
    });

    test('should throw an error if attendee not found', async () => {
      const { promise } = await fixture.write.promise.output({
        host: http.request.auth.user,
      });

      const pid = hasher.encode(promise.id);
      await http.request.delegatePromise({ pid }).put.query({ attendeeId: 0 }).expect(404);
    });

    test('should throw an error if attendee is host', async () => {
      const { host, promise } = await fixture.write.promise.output({
        host: http.request.auth.user,
      });

      const pid = hasher.encode(promise.id);
      await http.request.delegatePromise({ pid }).put.query({ attendeeId: host.id }).expect(404);
    });

    test('should throw an error if promise not found', async () => {
      await http.request
        .delegatePromise({ pid: hasher.encode(0) })
        .put.query({ attendeeId: 0 })
        .expect(404);
    });
  });

  describe(http.request.completePromise, () => {
    test('should complete a promise', async () => {
      const { promise } = await fixture.write.promise.output({
        host: http.request.auth.user,
      });

      const pid = hasher.encode(promise.id);
      const res = await http.request.completePromise({ pid }).put.expect(200);

      expect(res.body).toEqual({ pid });
    });

    test('should throw an error if not host', async () => {
      const { promise } = await fixture.write.promise.output();

      const pid = hasher.encode(promise.id);
      await http.request.completePromise({ pid }).put.expect(404);
    });

    test('should throw an error if promise not found', async () => {
      await http.request.completePromise({ pid: hasher.encode(0) }).post.expect(404);
    });

    test('should throw an error if not attended', async () => {
      const { promise } = await fixture.write.promise.output();

      const pid = hasher.encode(promise.id);
      await http.request.completePromise({ pid }).put.expect(404);
    });

    test('should throw an error if promisedAt is in the past', async () => {
      const { promise } = await fixture.write.promise.output({
        partial: {
          promisedAt: new Date(yesterday),
        },
      });

      const pid = hasher.encode(promise.id);
      await http.request.completePromise({ pid }).put.expect(404);
    });

    test('should throw an error if already completed', async () => {
      const { promise } = await fixture.write.promise.output({
        partial: {
          completedAt: new Date(yesterday),
        },
      });

      const pid = hasher.encode(promise.id);
      await http.request.completePromise({ pid }).put.expect(404);
    });
  });

  describe(http.request.getStartLocation, () => {
    test('should return start location', async () => {
      const { promise, startLocations } = await fixture.write.promise.output({
        attendees: [http.request.auth.user],
        startLocations: 1,
      });

      const pid = hasher.encode(promise.id);
      const res = await http.request.getStartLocation({ pid }).get.expect(200);

      const [startLocation] = startLocations;
      expect(res.body).toEqual({
        ...R.omit(startLocation, ['createdAt', 'updatedAt']),
        latitude: parseFloat(startLocation.latitude.toString()),
        longitude: parseFloat(startLocation.longitude.toString()),
      });
    });

    test('should throw an error if start location not found', async () => {
      const { promise } = await fixture.write.promise.output({
        host: http.request.auth.user,
      });

      const pid = hasher.encode(promise.id);
      await http.request.getStartLocation({ pid }).get.expect(404);
    });

    test('should throw an error if promise not found', async () => {
      const pid = hasher.encode(0);
      await http.request.getStartLocation({ pid }).get.expect(404);
    });

    test('should throw an error if not attended', async () => {
      const { promise } = await fixture.write.promise.output();

      const pid = hasher.encode(promise.id);
      await http.request.getStartLocation({ pid }).get.expect(404);
    });

    test('should throw an error if promisedAt is in the past', async () => {
      const { promise } = await fixture.write.promise.output({
        partial: {
          promisedAt: new Date(yesterday),
        },
      });

      const pid = hasher.encode(promise.id);
      await http.request.getStartLocation({ pid }).get.expect(404);
    });

    test('should throw an error if already completed', async () => {
      const { promise } = await fixture.write.promise.output({
        partial: {
          completedAt: new Date(yesterday),
        },
      });

      const pid = hasher.encode(promise.id);
      await http.request.getStartLocation({ pid }).get.expect(404);
    });
  });

  describe(http.request.updateStartLocation, () => {
    const input = {
      name: '장소',
      city: '서울',
      district: '강남구',
      address1: '테헤란로 427',
      address2: '11층',
      latitude: 37.5665,
      longitude: 127.0365,
    } satisfies InputLocationDTO;

    test('should update start location', async () => {
      const { promise } = await fixture.write.promise.output({
        attendees: [http.request.auth.user],
        startLocations: 1,
      });

      const pid = hasher.encode(promise.id);
      const res = await http.request.updateStartLocation({ pid }).put.send(input);
      expect(res.body).toEqual({ ...input, id: expect.toBeNumber() });
    });

    test('should create start location if not exists', async () => {
      const { promise } = await fixture.write.promise.output({
        host: http.request.auth.user,
      });

      const pid = hasher.encode(promise.id);

      {
        const res = await http.request
          .updateStartLocation({ pid })
          .put.send({ ...input })
          .expect(200);

        expect(res.body).toEqual({ ...input, id: expect.toBeNumber() });
      }

      {
        const res = await http.request.getStartLocation({ pid }).get.expect(200);
        expect(res.body).toEqual({ ...input, id: expect.toBeNumber() });
      }
    });

    test('should update is_latest_destination if start location is created', async () => {
      const { promise } = await fixture.write.promise.output({
        host: http.request.auth.user,
        destination: true,
        attendees: 2,
        startLocations: 2,
        partial: {
          destinationType: DestinationType.DYNAMIC,
          isLatestDestination: true,
        },
      });

      expect(promise.isLatestDestination).toBeTrue();

      const pid = hasher.encode(promise.id);

      await http.request.getStartLocation({ pid }).get.expect(404);
      await http.request.updateStartLocation({ pid }).put.send(input).expect(200);
      const res = await http.request.getPromise({ pid }).get.expect(200);
      expect(res.body.isLatestDestination).toBeFalse();
    });

    test('should update is_latest_destination if start location is updated', async () => {
      const { promise } = await fixture.write.promise.output({
        host: http.request.auth.user,
        destination: true,
        hostStartLocation: true,
        attendees: 2,
        startLocations: 2,
        partial: {
          destinationType: DestinationType.DYNAMIC,
          isLatestDestination: true,
        },
      });

      expect(promise.isLatestDestination).toBeTrue();

      const pid = hasher.encode(promise.id);

      await http.request.getStartLocation({ pid }).get.expect(200);
      await http.request.updateStartLocation({ pid }).put.send(input).expect(200);
      const res = await http.request.getPromise({ pid }).get.expect(200);
      expect(res.body.isLatestDestination).toBeFalse();
    });

    test('should not update is_latest_destination if destination not exists', async () => {
      const asset = await fixture.write.promise.output({
        host: http.request.auth.user,
        destination: false,
        attendees: 2,
        startLocations: 1,
        hostStartLocation: false,
        partial: {
          destinationType: DestinationType.DYNAMIC,
          isLatestDestination: false,
        },
      });

      expect(asset.promise.isLatestDestination).toBeFalse();

      const pid = hasher.encode(asset.promise.id);

      await http.request.getStartLocation({ pid }).get.expect(404);
      await http.request.updateStartLocation({ pid }).put.send(input).expect(200);
      const res = await http.request.getPromise({ pid }).get.expect(200);
      expect(res.body.isLatestDestination).toBeFalse();
    });

    test('should not update is_latest_destination if start location is updated', async () => {
      const attendees = await Promise.all([
        http.request.auth.user,
        fixture.write.user.output(),
        fixture.write.user.output(),
      ]);

      const { promise } = await fixture.write.promise.output({
        destination: true,
        attendees,
        startLocations: attendees.length,
        partial: {
          destinationType: DestinationType.DYNAMIC,
          isLatestDestination: true,
        },
      });

      expect(promise.isLatestDestination).toBeTrue();

      const pid = hasher.encode(promise.id);

      const res = await http.request.getStartLocation({ pid }).get.expect(200);
      await http.request.updateStartLocation({ pid }).put.send(res.body).expect(200);

      const updatedRes = await http.request.getPromise({ pid }).get.expect(200);
      expect(updatedRes.body.isLatestDestination).toBeTrue();
    });

    test('should throw an error if promise not found', async () => {
      const pid = hasher.encode(0);
      await http.request.updateStartLocation({ pid }).put.send(input).expect(404);
    });

    test('should throw an error if not attended', async () => {
      const { promise } = await fixture.write.promise.output();

      const pid = hasher.encode(promise.id);
      await http.request.updateStartLocation({ pid }).put.send(input).expect(404);
    });

    test('should throw an error if promise is unavailable', async () => {
      const { promise } = await fixture.write.promise.output({
        partial: {
          promisedAt: new Date(yesterday),
        },
      });

      const pid = hasher.encode(promise.id);
      await http.request.updateStartLocation({ pid }).put.send(input).expect(404);
    });

    test('should throw an error if already completed', async () => {
      const { promise } = await fixture.write.promise.output({
        partial: {
          completedAt: new Date(yesterday),
        },
      });

      const pid = hasher.encode(promise.id);
      await http.request.updateStartLocation({ pid }).put.send(input).expect(404);
    });
  });

  describe(http.request.deleteStartLocation, () => {
    test('should delete start location', async () => {
      const { promise } = await fixture.write.promise.output({
        attendees: [http.request.auth.user],
        startLocations: 1,
      });

      const pid = hasher.encode(promise.id);
      await http.request.deleteStartLocation({ pid }).delete.expect(200);

      await http.request.getStartLocation({ pid }).get.expect(404);
    });

    test('should throw an error if start location not found', async () => {
      const { promise } = await fixture.write.promise.output({
        host: http.request.auth.user,
      });

      const pid = hasher.encode(promise.id);
      await http.request.deleteStartLocation({ pid }).delete.expect(404);
    });

    test('should throw an error if promise not found', async () => {
      const pid = hasher.encode(0);
      await http.request.deleteStartLocation({ pid }).delete.expect(404);
    });

    test('should throw an error if not attended', async () => {
      const { promise } = await fixture.write.promise.output();

      const pid = hasher.encode(promise.id);
      await http.request.deleteStartLocation({ pid }).delete.expect(404);
    });

    test('should throw an error if promisedAt is in the past', async () => {
      const { promise } = await fixture.write.promise.output({
        partial: {
          promisedAt: new Date(yesterday),
        },
      });

      const pid = hasher.encode(promise.id);
      await http.request.deleteStartLocation({ pid }).delete.expect(404);
    });

    test('should throw an error if already completed', async () => {
      const { promise } = await fixture.write.promise.output({
        partial: {
          completedAt: new Date(yesterday),
        },
      });

      const pid = hasher.encode(promise.id);
      await http.request.deleteStartLocation({ pid }).delete.expect(404);
    });
  });

  describe(http.request.getMiddleLocation, () => {
    test('should return calculated middle location of attendees start locations', async () => {
      const { promise } = await fixture.write.promise.output({
        host: http.request.auth.user,
        attendees: 3,
        startLocations: 3,
      });

      const pid = hasher.encode(promise.id);
      const res = await http.request.getMiddleLocation({ pid }).get.expect(200);

      expect(res.body).toEqual({
        ref: expect.toBeString(),
        latitude: expect.toBeNumber(),
        longitude: expect.toBeNumber(),
      });
    });

    test('should return calculated middle location of start locations with provided attendee ids', async () => {
      const randomLat = () => Math.random() * 180 - 90;
      const randomLng = () => Math.random() * 360 - 180;

      const allDifferent = (arr: any[]) => arr.every((v, i, a) => a.indexOf(v) === i);

      const locations = await Promise.all(
        R.times(10, () =>
          fixture.write.location.output({
            latitude: new Prisma.Decimal(randomLat()),
            longitude: new Prisma.Decimal(randomLng()),
          })
        )
      );
      const { promise, attendees } = await fixture.write.promise.output({
        host: http.request.auth.user,
        attendees: 10,
        startLocations: locations,
      });

      const cases = [
        [attendees[0], attendees[3], attendees[5], attendees[7], attendees[9]],
        [attendees[1], attendees[2], attendees[4], attendees[6], attendees[8]],
        [attendees[0], attendees[1], attendees[2], attendees[3], attendees[4]],
      ].map((attendees) => attendees.map((attendee) => attendee.id));

      const pid = hasher.encode(promise.id);
      const responses = await Promise.all(
        cases.map(async (attendeeIds) => {
          const res = await http.request.getMiddleLocation({ pid }).get.query({ attendeeIds }).expect(200);
          return res.body;
        })
      );

      const latitudes = responses.map((res) => res.latitude);
      const longitudes = responses.map((res) => res.longitude);

      expect(latitudes).toSatisfyAll(Number.isFinite);
      expect(latitudes).toSatisfyAll(Number.isFinite);
      expect(allDifferent(latitudes)).toBeTrue();
      expect(allDifferent(longitudes)).toBeTrue();
    });

    test('should throw an error if no start locations', async () => {
      const { promise } = await fixture.write.promise.output({
        host: http.request.auth.user,
        attendees: 3,
      });

      const pid = hasher.encode(promise.id);
      await http.request.getMiddleLocation({ pid }).get.expect(400);
    });

    test('should throw an error if start locations are less than 2', async () => {
      const { promise } = await fixture.write.promise.output({
        host: http.request.auth.user,
        attendee: true,
        startLocation: true,
      });

      const pid = hasher.encode(promise.id);
      await http.request.getMiddleLocation({ pid }).get.expect(400);
    });

    test('should throw an error if promise not found', async () => {
      const pid = hasher.encode(0);
      await http.request.getMiddleLocation({ pid }).get.expect(404);
    });

    test('should throw an error if not attended', async () => {
      const { promise } = await fixture.write.promise.output();

      const pid = hasher.encode(promise.id);
      await http.request.getMiddleLocation({ pid }).get.expect(404);
    });

    test('should throw an error if promisedAt is in the past', async () => {
      const { promise } = await fixture.write.promise.output({
        partial: {
          promisedAt: new Date(yesterday),
        },
      });

      const pid = hasher.encode(promise.id);
      await http.request.getMiddleLocation({ pid }).get.expect(404);
    });

    test('should throw an error if already completed', async () => {
      const { promise } = await fixture.write.promise.output({
        partial: {
          completedAt: new Date(yesterday),
        },
      });

      const pid = hasher.encode(promise.id);
      await http.request.getMiddleLocation({ pid }).get.expect(404);
    });
  });

  describe(http.request.enqueuePromise, () => {
    mockGlobalFn('setTimeout');

    const deviceId = 'test-device-id';

    test('should enqueue deviceId to promise queue', async () => {
      const { promise } = await fixture.write.promise.output();

      const pid = hasher.encode(promise.id);
      await http.request.enqueuePromise().post.query({ pid, deviceId }).expect(201);
    });

    test('should throw an error if deviceId is empty', async () => {
      const { promise } = await fixture.write.promise.output();

      const pid = hasher.encode(promise.id);
      await http.request.enqueuePromise().post.query({ pid, deviceId: '' }).expect(400);
    });

    test('should throw an error if promise not found', async () => {
      const pid = hasher.encode(0);
      await http.request.enqueuePromise().post.query({ pid, deviceId }).expect(404);
    });
  });

  describe(http.request.dequeuePromise, () => {
    mockGlobalFn('setTimeout');

    const deviceId = 'test-device-id';

    test('should dequeue deviceId from promise queue', async () => {
      const { promise } = await fixture.write.promise.output();

      const pid = hasher.encode(promise.id);
      await http.request.enqueuePromise().post.query({ pid, deviceId }).expect(201);
      const res = await http.request.dequeuePromise().get.query({ deviceId }).expect(200);

      expect(res.body).toEqual({ pid });
    });

    test('should throw an error if deviceId is empty', async () => {
      const { promise } = await fixture.write.promise.output();

      const pid = hasher.encode(promise.id);
      await http.request.enqueuePromise().post.query({ pid, deviceId }).expect(201);
      await http.request.dequeuePromise().get.query({ deviceId: '' }).expect(404);
    });

    test('should throw an error if promise not found', async () => {
      const { promise } = await fixture.write.promise.output();

      const pid = hasher.encode(promise.id);
      await http.request.enqueuePromise().post.query({ pid, deviceId }).expect(201);
      await prisma.promise.update({ where: { id: promise.id }, data: { promisedAt: yesterday } });

      await http.request.dequeuePromise().get.query({ deviceId }).expect(404);
    });

    test('should throw an error if deviceId is not enqueued', async () => {
      await http.request.dequeuePromise().get.query({ deviceId }).expect(404);
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    http.request.close();
  });
});
