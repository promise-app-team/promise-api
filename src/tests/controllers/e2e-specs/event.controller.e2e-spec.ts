import { Test } from '@nestjs/testing';

import { AppModule } from '@/app';
import { CacheService } from '@/customs/cache';
import { configure } from '@/main';
import { JwtAuthTokenService } from '@/modules/auth';
import { EventController } from '@/modules/event/event.controller';
import { createTestFixture } from '@/tests/fixtures';
import { createPrismaClient } from '@/tests/setups/prisma';

import { createHttpRequest } from '../utils/http-request';

import type { NestExpressApplication } from '@nestjs/platform-express';

describe(EventController, () => {
  const prisma = createPrismaClient();
  const fixture = createTestFixture(prisma, { from: 8e7, to: 9e7 });
  const http = createHttpRequest<EventController>('event', {
    requestConnectEvent: 'connect',
    requestDisconnectEvent: 'disconnect',
    requestPingEvent: 'ping',
    requestShareLocationEvent: 'share-location',
  });

  let cacheService: CacheService;
  let jwtAuthTokenService: JwtAuthTokenService;

  const cacheKey = (event: string, channel = 'public') =>
    `connection:[{"event":"${event}","channel":"${channel}","stage":"test"}]`;
  const params = (event: string, opts?: { client?: typeof http.request; channel?: string }) => ({
    event,
    channel: opts?.channel,
    connectionId: (opts?.client ?? http.request).auth.user.id,
  });
  const { tomorrow, yesterday } = fixture.date;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app = module.createNestApplication<NestExpressApplication>();
    http.prepare(await configure(app).then((app) => app.init()));

    cacheService = module.get(CacheService);
    jwtAuthTokenService = module.get(JwtAuthTokenService);
  });

  beforeEach(async () => {
    const authUser = await fixture.write.user.output();
    http.request.authorize(authUser, { jwt: jwtAuthTokenService });
    fixture.configure({ authUser });
  });

  describe(http.request.requestConnectEvent, () => {
    describe('ping', () => {
      test('should connect client to websocket', async () => {
        await http.request.requestConnectEvent().get.query(params('ping')).expect(200);
        const connections = await cacheService.get(cacheKey('ping'));
        expect(connections).toHaveLength(1);
        expect(connections[0]).toEqual({
          cid: `${http.request.auth.user.id}`,
          uid: http.request.auth.user.id,
          iat: expect.any(Number),
          exp: expect.any(Number),
        });
      });
    });

    describe('share-location', () => {
      test('should throw 403 error when user has no attended promise', async () => {
        await http.request.requestConnectEvent().get.query(params('share-location')).expect(403);
        const connections = await cacheService.get(cacheKey('share-location'));
        expect(connections).toBeNull();
      });

      test('should throw 403 error when user has no active promise', async () => {
        await fixture.write.promise.output({
          host: http.request.auth.user,
          partial: { promisedAt: new Date(yesterday) },
        });

        await http.request.requestConnectEvent().get.query(params('share-location')).expect(403);
        const connections = await cacheService.get(cacheKey('share-location'));
        expect(connections).toBeNull();
      });

      test('should connect client to websocket when user has active promise', async () => {
        const { promise } = await fixture.write.promise.output({
          host: http.request.auth.user,
          partial: { promisedAt: new Date(tomorrow) },
        });

        await http.request.requestConnectEvent().get.query(params('share-location')).expect(200);
        const connections = await cacheService.get(cacheKey('share-location', `promise_${promise.id}`));
        expect(connections).toHaveLength(1);
        expect(connections[0]).toEqual({
          cid: `${http.request.auth.user.id}`,
          uid: http.request.auth.user.id,
          iat: expect.any(Number),
          exp: expect.any(Number),
        });
      });
    });

    describe('exception', () => {
      test('should throw 401 error if user is not authorized', async () => {
        await http.request.requestConnectEvent().get.auth('nope', { type: 'bearer' }).query(params('ping')).expect(401);
      });

      test('should throw 403 error if event is not provided', async () => {
        await http.request.requestConnectEvent().get.expect(403);
        await http.request.requestConnectEvent().get.query({ event: '' }).expect(403);
      });

      test('should throw 403 error if event not exists', async () => {
        await http.request.requestConnectEvent().get.query({ event: 'NOT_EXISTS' }).expect(403);
      });
    });
  });

  describe(http.request.requestDisconnectEvent, () => {
    describe('ping', () => {
      test('should disconnect client from websocket', async () => {
        await http.request.requestConnectEvent().get.query(params('ping')).expect(200);
        await expect(cacheService.get(cacheKey('ping'))).resolves.toEqual(
          expect.arrayContaining([expect.objectContaining({ cid: `${http.request.auth.user.id}` })])
        );

        await http.request.requestDisconnectEvent().get.query(params('ping')).expect(200);
        await expect(cacheService.get(cacheKey('ping'))).resolves.not.toEqual(
          expect.arrayContaining([expect.objectContaining({ cid: `${http.request.auth.user.id}` })])
        );
      });

      test('should do nothing if client is not connected', async () => {
        await http.request.requestDisconnectEvent().get.query(params('ping')).expect(200);
      });
    });

    describe('share-location', () => {
      test('should disconnect client from websocket', async () => {
        const { promise } = await fixture.write.promise.output({
          host: http.request.auth.user,
          partial: { promisedAt: new Date(tomorrow) },
        });

        await http.request.requestConnectEvent().get.query(params('share-location')).expect(200);
        await expect(cacheService.get(cacheKey('share-location', `promise_${promise.id}`))).resolves.toEqual(
          expect.arrayContaining([expect.objectContaining({ cid: `${http.request.auth.user.id}` })])
        );

        await http.request.requestDisconnectEvent().get.query(params('share-location')).expect(200);
        await expect(cacheService.get(cacheKey('share-location', `promise_${promise.id}`))).resolves.not.toEqual(
          expect.arrayContaining([expect.objectContaining({ cid: `${http.request.auth.user.id}` })])
        );
      });

      test('should do nothing if client is not connected', async () => {
        await http.request.requestDisconnectEvent().get.query(params('share-location')).expect(200);
      });
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    http.request.close();
  });
});
