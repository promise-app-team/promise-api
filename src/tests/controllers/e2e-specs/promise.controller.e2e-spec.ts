import { JwtService } from '@nestjs/jwt';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import * as R from 'remeda';

import { AppModule } from '@/app/app.module';
import { InthashService } from '@/customs/inthash/inthash.service';
import { configure } from '@/main';
import { PromiseController } from '@/modules/promise/promise.controller';
import { InputPromiseDTO, InputLocationDTO, PromiseDTO } from '@/modules/promise/promise.dto';
import { DestinationType, LocationShareType } from '@/prisma/prisma.entity';
import { createHttpRequest } from '@/tests/controllers/utils/http-request';
import { createTestFixture } from '@/tests/fixtures';
import { createPrismaClient } from '@/tests/prisma';

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
    getStartLocation: ':pid(\\d+)/start-location',
    updateStartLocation: ':pid(\\d+)/start-location',
    deleteStartLocation: ':pid(\\d+)/start-location',
    getMiddleLocation: ':pid(\\d+)/middle-location',
    getThemes: 'themes',
    dequeuePromise: 'queue',
    enqueuePromise: 'queue',
  });

  const { tomorrow, yesterday } = fixture.date;

  let hasher: InthashService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = module.createNestApplication<NestExpressApplication>();
    http.prepare(await configure(app).init());

    const authUser = await fixture.write.user.output();
    http.request.authorize(authUser, { jwt: module.get(JwtService) });
    fixture.configure({ authUser });
    hasher = module.get(InthashService);
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
      locationShareStartType: promise.locationShareStartType,
      locationShareStartValue: promise.locationShareStartValue,
      locationShareEndType: promise.locationShareEndType,
      locationShareEndValue: promise.locationShareEndValue,
      promisedAt: expect.toBeString(),
      completedAt: promise.completedAt ? new Date(promise.completedAt) : null,
      createdAt: expect.toBeString(),
      host: {
        id: host.id,
        username: host.username,
        profileUrl: host.profileUrl,
      },
      themes: expect.toIncludeSameMembers(themes.map((theme) => theme.name)),
      destination: destination
        ? {
            id: destination.id,
            city: destination.city,
            district: destination.district,
            address: destination.address,
            latitude: parseFloat(destination.latitude),
            longitude: parseFloat(destination.longitude),
          }
        : null,
      attendees: expect.toIncludeSameMembers(
        attendees.map((attendee: any, i: any) => ({
          id: attendee.id,
          username: attendee.username,
          profileUrl: attendee.profileUrl,
          hasStartLocation: i === 0,
        }))
      ),
    } satisfies Omit<PromiseDTO, 'id'>;
  }

  describe(http.request.getMyPromises, () => {
    test('should return promises', async () => {
      const assets = R.pipe(
        await Promise.all(
          R.times(3, () =>
            fixture.write.promise.output({
              host: http.request.auth.user,
              destination: true,
              attendees: 3,
              themes: 3,
              startLocations: 1,
            })
          )
        ),
        R.sortBy((asset) => asset.promise.id)
      );

      const res = await http.request.getMyPromises().get.expect(200);

      expect(res.body).toBeArrayOfSize(3);
      expect(res.body[0]).toEqual(toPromiseDTO(assets[0]));
      expect(res.body[1]).toEqual(toPromiseDTO(assets[1]));
      expect(res.body[2]).toEqual(toPromiseDTO(assets[2]));
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
      } satisfies InputPromiseDTO;

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
      } satisfies InputPromiseDTO;

      await http.request.createPromise().post.send(input).expect(400);
    });
  });

  describe(http.request.updatePromise, () => {
    const input = {
      title: 'updated title',
      destinationType: DestinationType.DYNAMIC,
      locationShareStartType: LocationShareType.DISTANCE,
      locationShareStartValue: 1000,
      locationShareEndType: LocationShareType.TIME,
      locationShareEndValue: 60,
      destination: {
        city: 'updated city',
        district: 'updated district',
        address: 'updated address',
        latitude: 37.5665,
        longitude: 127.0365,
      },
      themeIds: [],
      promisedAt: tomorrow,
    } satisfies InputPromiseDTO;

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
      expect(res.body).toEqual(toPromiseDTO({ ...asset, themes }));
    });

    test('should throw an error if promise not found', async () => {
      const pid = hasher.encode(0);
      await http.request.updatePromise({ pid }).put.send(input).expect(404);
    });

    test('should throw an error if not host', async () => {
      const asset = await fixture.write.promise.output();

      const pid = hasher.encode(asset.promise.id);
      await http.request.updatePromise({ pid }).put.send(input).expect(403);
    });
  });

  describe(http.request.attendPromise, () => {
    test('should attend a promise', async () => {
      const asset = await fixture.write.promise.output();

      const pid = hasher.encode(asset.promise.id);
      const res = await http.request.attendPromise({ pid }).post.expect(201);

      expect(res.body).toEqual({ pid });
    });

    test('should throw an error if already attended', async () => {
      const asset = await fixture.write.promise.output();

      const pid = hasher.encode(asset.promise.id);
      await http.request.attendPromise({ pid }).post.expect(201);
      await http.request.attendPromise({ pid }).post.expect(400);
    });

    test('should throw an error if promise not found', async () => {
      const pid = hasher.encode(0);
      await http.request.attendPromise({ pid }).post.expect(404);
    });

    test('should throw an error if promisedAt is in the past', async () => {
      const asset = await fixture.write.promise.output({
        partial: {
          promisedAt: new Date(yesterday),
        },
      });

      const pid = hasher.encode(asset.promise.id);
      await http.request.attendPromise({ pid }).post.expect(404);
    });

    test('should throw an error if already completed', async () => {
      const asset = await fixture.write.promise.output({
        partial: {
          completedAt: new Date(yesterday),
        },
      });

      const pid = hasher.encode(asset.promise.id);
      await http.request.attendPromise({ pid }).post.expect(404);
    });
  });

  describe(http.request.leavePromise, () => {
    test('should leave a promise', async () => {
      const asset = await fixture.write.promise.output();

      const pid = hasher.encode(asset.promise.id);
      await http.request.attendPromise({ pid }).post.expect(201);
      await http.request.leavePromise({ pid }).delete.expect(200);
    });

    test('should throw an error if not attended', async () => {
      const asset = await fixture.write.promise.output();

      const pid = hasher.encode(asset.promise.id);
      await http.request.leavePromise({ pid }).delete.expect(404);
    });

    test('should throw an error if promisedAt is in the past', async () => {
      const asset = await fixture.write.promise.output({
        partial: {
          promisedAt: new Date(yesterday),
        },
      });

      const pid = hasher.encode(asset.promise.id);
      await http.request.attendPromise({ pid }).post.expect(404);
    });

    test('should throw an error if already completed', async () => {
      const asset = await fixture.write.promise.output({
        partial: {
          completedAt: new Date(yesterday),
        },
      });

      const pid = hasher.encode(asset.promise.id);
      await http.request.attendPromise({ pid }).post.expect(404);
    });

    test('should throw an error if promise not found', async () => {
      const pid = hasher.encode(0);
      await http.request.leavePromise({ pid }).delete.expect(404);
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
      const asset = await fixture.write.promise.output({
        host: http.request.auth.user,
      });

      const pid = hasher.encode(asset.promise.id);
      await http.request.getStartLocation({ pid }).get.expect(404);
    });

    test('should throw an error if promise not found', async () => {
      const pid = hasher.encode(0);
      await http.request.getStartLocation({ pid }).get.expect(404);
    });

    test('should throw an error if not attended', async () => {
      const asset = await fixture.write.promise.output();

      const pid = hasher.encode(asset.promise.id);
      await http.request.getStartLocation({ pid }).get.expect(404);
    });

    test('should throw an error if promisedAt is in the past', async () => {
      const asset = await fixture.write.promise.output({
        partial: {
          promisedAt: new Date(yesterday),
        },
      });

      const pid = hasher.encode(asset.promise.id);
      await http.request.getStartLocation({ pid }).get.expect(404);
    });

    test('should throw an error if already completed', async () => {
      const asset = await fixture.write.promise.output({
        partial: {
          completedAt: new Date(yesterday),
        },
      });

      const pid = hasher.encode(asset.promise.id);
      await http.request.getStartLocation({ pid }).get.expect(404);
    });
  });

  describe(http.request.updateStartLocation, () => {
    const input = {
      city: '서울',
      district: '강남구',
      address: '테헤란로 427',
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
      expect(res.body).toEqual({
        ...input,
        id: expect.toBeNumber(),
      });
    });

    test('should create start location if not exists', async () => {
      const asset = await fixture.write.promise.output({
        host: http.request.auth.user,
      });

      const pid = hasher.encode(asset.promise.id);
      const res = await http.request.updateStartLocation({ pid }).put.send(input).expect(200);

      expect(res.body).toEqual({
        ...input,
        id: expect.toBeNumber(),
      });
    });

    test('should throw an error if promise not found', async () => {
      const pid = hasher.encode(0);
      await http.request.updateStartLocation({ pid }).put.send(input).expect(404);
    });

    test('should throw an error if not attended', async () => {
      const asset = await fixture.write.promise.output();

      const pid = hasher.encode(asset.promise.id);
      await http.request.updateStartLocation({ pid }).put.send(input).expect(404);
    });

    test('should throw an error if promise is unavailable', async () => {
      const asset = await fixture.write.promise.output({
        partial: {
          promisedAt: new Date(yesterday),
        },
      });

      const pid = hasher.encode(asset.promise.id);
      await http.request.updateStartLocation({ pid }).put.send(input).expect(404);
    });

    test('should throw an error if already completed', async () => {
      const asset = await fixture.write.promise.output({
        partial: {
          completedAt: new Date(yesterday),
        },
      });

      const pid = hasher.encode(asset.promise.id);
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
      const asset = await fixture.write.promise.output({
        host: http.request.auth.user,
      });

      const pid = hasher.encode(asset.promise.id);
      await http.request.deleteStartLocation({ pid }).delete.expect(404);
    });

    test('should throw an error if promise not found', async () => {
      const pid = hasher.encode(0);
      await http.request.deleteStartLocation({ pid }).delete.expect(404);
    });

    test('should throw an error if not attended', async () => {
      const asset = await fixture.write.promise.output();

      const pid = hasher.encode(asset.promise.id);
      await http.request.deleteStartLocation({ pid }).delete.expect(404);
    });

    test('should throw an error if promisedAt is in the past', async () => {
      const asset = await fixture.write.promise.output({
        partial: {
          promisedAt: new Date(yesterday),
        },
      });

      const pid = hasher.encode(asset.promise.id);
      await http.request.deleteStartLocation({ pid }).delete.expect(404);
    });

    test('should throw an error if already completed', async () => {
      const asset = await fixture.write.promise.output({
        partial: {
          completedAt: new Date(yesterday),
        },
      });

      const pid = hasher.encode(asset.promise.id);
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
        latitude: expect.toBeNumber(),
        longitude: expect.toBeNumber(),
      });
    });

    test('should return calculated middle location of start locations with provided attendee ids', async () => {
      const randomLat = () => Math.random() * 180 - 90;
      const randomLng = () => Math.random() * 360 - 180;

      const allDifferent = (arr: any[]) => arr.every((v, i, a) => a.indexOf(v) === i);

      const locations = await Promise.all(
        R.times(5, () =>
          fixture.write.location.output({
            latitude: new Prisma.Decimal(randomLat()),
            longitude: new Prisma.Decimal(randomLng()),
          })
        )
      );
      const { promise, attendees } = await fixture.write.promise.output({
        host: http.request.auth.user,
        attendees: 5,
        startLocations: locations,
      });

      const cases = [
        [attendees[0], attendees[1], attendees[2]],
        [attendees[1], attendees[2], attendees[3]],
        [attendees[2], attendees[3], attendees[4]],
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
      const asset = await fixture.write.promise.output();

      const pid = hasher.encode(asset.promise.id);
      await http.request.getMiddleLocation({ pid }).get.expect(404);
    });

    test('should throw an error if promisedAt is in the past', async () => {
      const asset = await fixture.write.promise.output({
        partial: {
          promisedAt: new Date(yesterday),
        },
      });

      const pid = hasher.encode(asset.promise.id);
      await http.request.getMiddleLocation({ pid }).get.expect(404);
    });

    test('should throw an error if already completed', async () => {
      const asset = await fixture.write.promise.output({
        partial: {
          completedAt: new Date(yesterday),
        },
      });

      const pid = hasher.encode(asset.promise.id);
      await http.request.getMiddleLocation({ pid }).get.expect(404);
    });
  });

  describe(http.request.getThemes, () => {
    test('should return themes', async () => {
      const themes = await fixture.write.themes.output(3);
      const res = await http.request.getThemes().get.expect(200);

      expect(res.body).toBeArrayOfSize(3);
      expect(res.body).toEqual(
        expect.toIncludeSameMembers(themes.map((theme) => ({ id: theme.id, name: theme.name })))
      );
    });
  });

  describe(http.request.enqueuePromise, () => {
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
