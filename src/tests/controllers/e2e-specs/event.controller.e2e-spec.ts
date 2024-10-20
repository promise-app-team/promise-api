import { Test } from '@nestjs/testing'

import { AppModule } from '@/app'
import { CacheService } from '@/customs/cache'
import { IntHashService } from '@/customs/inthash'
import { configure } from '@/main'
import { JwtAuthTokenService } from '@/modules/auth'
import { EventHandler, PingEvent } from '@/modules/event'
import { EventController } from '@/modules/event/event.controller'
import { createTestFixture } from '@/tests/fixtures'
import { createPrismaClient } from '@/tests/setups/prisma'

import { createHttpRequest } from '../utils/http-request'

import type { Events, ShareLocationEvent } from '@/modules/event'
import type { NestExpressApplication } from '@nestjs/platform-express'

describe(EventController, () => {
  const prisma = createPrismaClient()
  const fixture = createTestFixture(prisma, { from: 8e7, to: 9e7 })
  const http = createHttpRequest<EventController>('event', {
    requestConnectEvent: 'connect',
    requestDisconnectEvent: 'disconnect',
    requestPingEvent: 'ping',
    requestShareLocationEvent: 'share-location',
  })

  let hasher: IntHashService
  let cacheService: CacheService
  let jwtAuthTokenService: JwtAuthTokenService

  let eventController: EventController

  let postToConnection: jest.SpyInstance

  const cacheKey = (event: keyof Events, channel = 'public') =>
    `connection:[{"event":"${event}","channel":"${channel}","stage":"test"}]`
  const params = (event: keyof Events, opts?: { client?: typeof http.request, channel?: string }) => ({
    event,
    channel: opts?.channel,
    connectionId: (opts?.client ?? http.request).auth.user.id,
  })
  const { tomorrow, yesterday } = fixture.date

  async function cloneHttpRequest(
    event: keyof Events,
    opts?: {
      channel?: string
      user?: Awaited<ReturnType<typeof fixture.write.user.output>>
    },
  ) {
    const authUser = opts?.user ?? (await fixture.write.user.output())
    const client = http.clone().authorize(authUser, { jwt: jwtAuthTokenService })
    await client.requestConnectEvent().get.query(params(event, { client, channel: opts?.channel }))
    return client
  }

  async function clearHttpRequest(..._clients: (typeof http.request)[]) {
    // await Promise.all(
    //   clients.map((client) =>
    //     client
    //       .requestDisconnectEvent()
    //       .get.query(params('ping', { client }))
    //       .expect(200)
    //       .then(() => client.unauthorize())
    //   )
    // );
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile()
    const app = module.createNestApplication<NestExpressApplication>()
    http.prepare(await configure(app).then(app => app.init()))

    hasher = module.get(IntHashService)
    cacheService = module.get(CacheService)
    jwtAuthTokenService = module.get(JwtAuthTokenService)

    eventController = module.get(EventController)
  })

  beforeEach(async () => {
    const authUser = await fixture.write.user.output()
    http.request.authorize(authUser, { jwt: jwtAuthTokenService })
    fixture.configure({ authUser })
  })

  beforeEach(async () => {
    Reflect.set(eventController, 'client', { postToConnection: jest.fn() })
    postToConnection = jest.spyOn(eventController['client'], 'postToConnection')
  })

  afterEach(async () => {
    postToConnection.mockRestore()
  })

  describe(http.request.requestConnectEvent, () => {
    describe('ping', () => {
      test('should connect client to websocket', async () => {
        await http.request.requestConnectEvent().get.query(params('ping')).expect(200)
        const connections = await cacheService.get(cacheKey('ping'))
        expect(connections).toHaveLength(1)
        expect(connections[0]).toEqual({
          cid: `${http.request.auth.user.id}`,
          uid: http.request.auth.user.id,
          iat: expect.any(Number),
          exp: expect.any(Number),
        })
      })
    })

    describe('share-location', () => {
      test('should throw 403 error when user has no attended promise', async () => {
        await http.request.requestConnectEvent().get.query(params('share-location')).expect(403)
        const connections = await cacheService.get(cacheKey('share-location'))
        expect(connections).toBeNull()
      })

      test('should throw 403 error when user has no active promise', async () => {
        await fixture.write.promise.output({
          host: http.request.auth.user,
          partial: { promisedAt: yesterday },
        })

        await http.request.requestConnectEvent().get.query(params('share-location')).expect(403)
        const connections = await cacheService.get(cacheKey('share-location'))
        expect(connections).toBeNull()
      })

      test('should connect client to websocket when user has active promise', async () => {
        const { promise } = await fixture.write.promise.output({
          host: http.request.auth.user,
          partial: { promisedAt: tomorrow },
        })

        await http.request.requestConnectEvent().get.query(params('share-location')).expect(200)
        const connections = await cacheService.get(cacheKey('share-location', `promise_${promise.id}`))
        expect(connections).toHaveLength(1)
        expect(connections[0]).toEqual({
          cid: `${http.request.auth.user.id}`,
          uid: http.request.auth.user.id,
          iat: expect.any(Number),
          exp: expect.any(Number),
        })
      })
    })

    describe('exception', () => {
      test('should throw 401 error if user is not authorized', async () => {
        await http.request.requestConnectEvent().get.auth('nope', { type: 'bearer' }).query(params('ping')).expect(401)
      })

      test('should throw 403 error if event is not provided', async () => {
        await http.request.requestConnectEvent().get.expect(403)
        await http.request.requestConnectEvent().get.query({ event: '' }).expect(403)
      })

      test('should throw 403 error if event not exists', async () => {
        await http.request.requestConnectEvent().get.query({ event: 'NOT_EXISTS' }).expect(403)
      })

      test('should throw 403 error if trying to connect client twice', async () => {
        await http.request.requestConnectEvent().get.query(params('ping')).expect(200)
        await http.request.requestConnectEvent().get.query(params('ping')).expect(403)
      })

      test('should throw 403 error if failed to connect client', async () => {
        const spy = jest
          .spyOn(eventController['service'], 'handleConnection')
          .mockRejectedValue(new Error('Unexpected Error'))

        await http.request.requestConnectEvent().get.query(params('ping')).expect(403)
        spy.mockRestore()
      })
    })
  })

  describe(http.request.requestDisconnectEvent, () => {
    describe('ping', () => {
      test('should disconnect client from websocket', async () => {
        await http.request.requestConnectEvent().get.query(params('ping')).expect(200)
        await expect(cacheService.get(cacheKey('ping'))).resolves.toEqual(
          expect.arrayContaining([expect.objectContaining({ cid: `${http.request.auth.user.id}` })]),
        )

        await http.request.requestDisconnectEvent().get.query(params('ping')).expect(200)
        await expect(cacheService.get(cacheKey('ping'))).resolves.not.toEqual(
          expect.arrayContaining([expect.objectContaining({ cid: `${http.request.auth.user.id}` })]),
        )
      })

      test('should do nothing if client is not connected', async () => {
        await http.request.requestDisconnectEvent().get.query(params('ping')).expect(200)
      })

      test('should throw 403 error if failed to disconnect client', async () => {
        const spy = jest
          .spyOn(eventController['service'], 'handleDisconnection')
          .mockRejectedValue(new Error('Unexpected Error'))

        await http.request.requestConnectEvent().get.query(params('ping')).expect(200)
        await http.request.requestDisconnectEvent().get.query(params('ping')).expect(403)
        spy.mockRestore()
      })
    })

    describe('share-location', () => {
      test('should disconnect client from websocket', async () => {
        const { promise } = await fixture.write.promise.output({
          host: http.request.auth.user,
        })

        await http.request.requestConnectEvent().get.query(params('share-location')).expect(200)
        await expect(cacheService.get(cacheKey('share-location', `promise_${promise.id}`))).resolves.toEqual(
          expect.arrayContaining([expect.objectContaining({ cid: `${http.request.auth.user.id}` })]),
        )

        await http.request.requestDisconnectEvent().get.query(params('share-location')).expect(200)
        await expect(cacheService.get(cacheKey('share-location', `promise_${promise.id}`))).resolves.not.toEqual(
          expect.arrayContaining([expect.objectContaining({ cid: `${http.request.auth.user.id}` })]),
        )
      })

      test('should do nothing if client is not connected', async () => {
        await http.request.requestDisconnectEvent().get.query(params('share-location')).expect(200)
      })
    })
  })

  describe(http.request.requestPingEvent, () => {
    describe('success', () => {
      test('should send message to self', async () => {
        const sender = await cloneHttpRequest('ping')

        const input = {
          event: 'ping',
          data: {
            param: { strategy: PingEvent.Strategy.Self },
            body: { message: 'Hello, World!' },
          },
        } satisfies PingEvent.Payload

        const res = await sender
          .requestPingEvent()
          .post.query(params('ping', { client: sender }))
          .send(input)
          .expect(201)

        expect(res.body).toEqual({ message: 'pong' })
        expect(postToConnection).toHaveBeenCalledExactlyOnceWith({
          ConnectionId: `${sender.auth.user.id}`,
          Data: expect.stringMatching(new RegExp(JSON.stringify(input.data.body))),
        })

        await clearHttpRequest(sender)
      })

      test('should send message to self with channel', async () => {
        const channel = 'ping_private_channel_1'
        const sender = await cloneHttpRequest('ping', { channel })

        const input = {
          event: 'ping',
          data: {
            param: { strategy: PingEvent.Strategy.Self, channel },
            body: { message: 'Hello, World!' },
          },
        } satisfies PingEvent.Payload

        const res = await sender
          .requestPingEvent()
          .post.query(params('ping', { client: sender, channel }))
          .send(input)
          .expect(201)

        expect(res.body).toEqual({ message: 'pong' })
        expect(postToConnection).toHaveBeenCalledExactlyOnceWith({
          ConnectionId: `${sender.auth.user.id}`,
          Data: expect.stringMatching(new RegExp(JSON.stringify(input.data.body))),
        })

        await clearHttpRequest(sender)
      })

      test('should send message to specific client', async () => {
        const sender = await cloneHttpRequest('ping')
        const receiver = await cloneHttpRequest('ping')

        const input = {
          event: 'ping',
          data: {
            param: { strategy: PingEvent.Strategy.Specific, to: `${receiver.auth.user.id}` },
            body: { message: 'Hello, World!' },
          },
        } satisfies PingEvent.Payload

        const res = await sender
          .requestPingEvent()
          .post.query(params('ping', { client: sender }))
          .send(input)
          .expect(201)
        expect(res.body).toEqual({ message: 'pong' })
        expect(postToConnection).toHaveBeenCalledExactlyOnceWith({
          ConnectionId: `${receiver.auth.user.id}`,
          Data: expect.stringMatching(new RegExp(JSON.stringify(input.data.body))),
        })

        clearHttpRequest(sender, receiver)
      })

      test('should send message to specific client with channel', async () => {
        const channel = 'private_channel_2'
        const sender = await cloneHttpRequest('ping', { channel })
        const receiver = await cloneHttpRequest('ping', { channel })

        const input = {
          event: 'ping',
          data: {
            param: { strategy: PingEvent.Strategy.Specific, to: `${receiver.auth.user.id}`, channel },
            body: { message: 'Hello, World!' },
          },
        } satisfies PingEvent.Payload

        const res = await sender
          .requestPingEvent()
          .post.query(params('ping', { client: sender, channel }))
          .send(input)
          .expect(201)

        expect(res.body).toEqual({ message: 'pong' })
        expect(postToConnection).toHaveBeenCalledExactlyOnceWith({
          ConnectionId: `${receiver.auth.user.id}`,
          Data: expect.stringMatching(new RegExp(JSON.stringify(input.data.body))),
        })

        await clearHttpRequest(sender, receiver)
      })

      test('should send message to specific client in another channel', async () => {
        const sender = await cloneHttpRequest('ping', { channel: 'channel_1' })
        const receiver = await cloneHttpRequest('ping', { channel: 'channel_2' })

        const input = {
          event: 'ping',
          data: {
            param: { strategy: PingEvent.Strategy.Specific, to: `${receiver.auth.user.id}`, channel: 'channel_2' },
            body: { message: 'Hello, World!' },
          },
        } satisfies PingEvent.Payload

        const res = await sender
          .requestPingEvent()
          .post.query(params('ping', { client: sender }))
          .send(input)
          .expect(201)

        expect(res.body).toEqual({ message: 'pong' })
        expect(postToConnection).toHaveBeenCalledExactlyOnceWith({
          ConnectionId: `${receiver.auth.user.id}`,
          Data: expect.stringMatching(new RegExp(JSON.stringify(input.data.body))),
        })

        await clearHttpRequest(sender, receiver)
      })

      test('should send message to all clients', async () => {
        const channel = 'private_channel_3'
        const sender = await cloneHttpRequest('ping', { channel })
        const receiver1 = await cloneHttpRequest('ping', { channel })
        const receiver2 = await cloneHttpRequest('ping', { channel: 'private' })
        const receiver3 = await cloneHttpRequest('ping', { channel })
        const receiver4 = await cloneHttpRequest('ping', { channel: 'private' })
        const receiver5 = await cloneHttpRequest('ping', { channel })

        const input = {
          event: 'ping',
          data: {
            param: { strategy: PingEvent.Strategy.Broadcast, channel },
            body: { message: 'Hello, World!' },
          },
        } satisfies PingEvent.Payload

        const receivers = [receiver1, receiver3, receiver5]

        const res = await sender
          .requestPingEvent()
          .post.query(
            params('ping', {
              client: sender,
              channel,
            }),
          )
          .send(input)
          .expect(201)

        expect(res.body).toEqual({ message: 'pong' })
        expect(postToConnection).toHaveBeenCalledTimes(receivers.length)
        for (const receiver of receivers) {
          expect(postToConnection).toHaveBeenCalledWith({
            ConnectionId: `${receiver.auth.user.id}`,
            Data: expect.stringMatching(new RegExp(JSON.stringify(input.data.body))),
          })
        }

        await clearHttpRequest(sender, receiver2, receiver4, ...receivers)
      })
    })

    describe('exception', () => {
      test('should receive error message if strategy is not provided', async () => {
        const sender = await cloneHttpRequest('ping')

        const input = {
          event: 'ping',
          data: {
            param: {} as any,
            body: { message: 'Hello, World!' },
          },
        } satisfies PingEvent.Payload

        await sender
          .requestPingEvent()
          .post.query(params('ping', { client: sender }))
          .send(input)
          .expect(201)

        expect(postToConnection).toHaveBeenCalledExactlyOnceWith({
          ConnectionId: `${sender.auth.user.id}`,
          Data: expect.stringMatching(/Strategy not found/),
        })

        await clearHttpRequest(sender)
      })

      test('should receive error message if strategy is not found', async () => {
        const sender = await cloneHttpRequest('ping')
        const strategy = 'NOT_EXISTS'

        const input = {
          event: 'ping',
          data: {
            param: { strategy } as any,
            body: { message: 'Hello, World!' },
          },
        } satisfies PingEvent.Payload

        await sender
          .requestPingEvent()
          .post.query(params('ping', { client: sender }))
          .send(input)
          .expect(201)

        expect(postToConnection).toHaveBeenCalledExactlyOnceWith({
          ConnectionId: `${sender.auth.user.id}`,
          Data: expect.stringMatching(new RegExp(`Strategy '${strategy}' not found`)),
        })

        await clearHttpRequest(sender)
      })

      test('should receive error message if channel is invalid in self strategy', async () => {
        const sender = await cloneHttpRequest('ping')
        const channel = 'NOT_EXISTS'

        const input = {
          event: 'ping',
          data: {
            param: { strategy: PingEvent.Strategy.Self, channel },
            body: { message: 'Hello, World!' },
          },
        } satisfies PingEvent.Payload

        await sender
          .requestPingEvent()
          .post.query(params('ping', { client: sender }))
          .send(input)
          .expect(201)

        expect(postToConnection).toHaveBeenCalledExactlyOnceWith({
          ConnectionId: `${sender.auth.user.id}`,
          Data: expect.stringMatching(new RegExp(`Connection '${sender.auth.user.id}' not found in '${channel}'`)),
        })

        await clearHttpRequest(sender)
      })

      test('should receive error message if to parameter is invalid in specific strategy', async () => {
        const sender = await cloneHttpRequest('ping')
        const receiver = await cloneHttpRequest('ping')
        const to = 'NOT_EXISTS'

        const input = {
          event: 'ping',
          data: {
            param: { strategy: PingEvent.Strategy.Specific, to },
            body: { message: 'Hello, World!' },
          },
        } satisfies PingEvent.Payload

        await sender
          .requestPingEvent()
          .post.query(params('ping', { client: sender }))
          .send(input)
          .expect(201)

        expect(postToConnection).toHaveBeenCalledExactlyOnceWith({
          ConnectionId: `${sender.auth.user.id}`,
          Data: expect.stringMatching(new RegExp(`Connection '${to}' not found in 'public'`)),
        })

        await clearHttpRequest(sender, receiver)
      })

      test('should receive error message if to parameter is not provided in specific strategy', async () => {
        const sender = await cloneHttpRequest('ping')

        const input = {
          event: 'ping',
          data: {
            param: { strategy: PingEvent.Strategy.Specific } as any,
            body: { message: 'Hello, World!' },
          },
        } satisfies PingEvent.Payload

        await sender
          .requestPingEvent()
          .post.query(params('ping', { client: sender }))
          .send(input)
          .expect(201)

        expect(postToConnection).toHaveBeenCalledExactlyOnceWith({
          ConnectionId: `${sender.auth.user.id}`,
          Data: expect.stringMatching(/Strategy 'specific' requires a 'to' parameter/),
        })

        await clearHttpRequest(sender)
      })

      // eslint-disable-next-line jest/no-disabled-tests
      test.skip('should receive error message if failed to send message', async () => {
        console.log('start of test')

        const sender = await cloneHttpRequest('ping')

        postToConnection.mockRejectedValueOnce({ name: 'GoneException' } as never)
        const disconnect = jest.spyOn(EventHandler, 'disconnect')

        const input = {
          event: 'ping',
          data: {
            param: { strategy: PingEvent.Strategy.Self },
            body: { message: 'Hello, World!' },
          },
        } satisfies PingEvent.Payload

        await sender
          .requestPingEvent()
          .post.query(params('ping', { client: sender }))
          .send(input)
          .expect(201)

        expect(disconnect).toHaveBeenCalledWith(`${sender.auth.user.id}`)
        postToConnection.mockReset()
        disconnect.mockRestore()

        await clearHttpRequest(sender)
      })
    })
  })

  describe(http.request.requestShareLocationEvent, () => {
    describe('success', () => {
      test('should share location to all clients in attended promises', async () => {
        const users = await fixture.write.users.output(3)
        const { promise: p1 } = await fixture.write.promise.output({ host: users[0], attendees: [users[1], users[2]] })
        const { promise: p2 } = await fixture.write.promise.output({ host: users[1], attendees: [users[0], users[2]] })

        const sender = await cloneHttpRequest('share-location', { user: users[0] })
        const receivers = await Promise.all(users.slice(1).map(user => cloneHttpRequest('share-location', { user })))

        const input = {
          event: 'share-location',
          data: {
            param: { promiseIds: [hasher.encode(p1.id), hasher.encode(p2.id)] },
            body: { lat: 37.123456, lng: 127.123456 },
          },
        } satisfies ShareLocationEvent.Payload

        const res = await sender
          .requestShareLocationEvent()
          .post.query(params('share-location', { client: sender }))
          .send(input)
          .expect(201)

        expect(res.body).toEqual({ message: 'location shared' })
        expect(postToConnection).toHaveBeenCalledTimes(4)

        for (const receiver of receivers) {
          expect(postToConnection).toHaveBeenCalledWith({
            ConnectionId: `${receiver.auth.user.id}`,
            Data: expect.stringMatching(new RegExp(JSON.stringify(input.data.body))),
          })
        }

        await clearHttpRequest(sender, ...receivers)
      })
    })

    describe('exception', () => {
      test('should receive error message if promiseIds is not provided', async () => {
        const user = await fixture.write.user.output()
        await fixture.write.promise({ host: user })
        const sender = await cloneHttpRequest('share-location', { user })

        const input = {
          event: 'share-location',
          data: {
            param: {} as any,
            body: { lat: 37.123456, lng: 127.123456 },
          },
        } satisfies ShareLocationEvent.Payload

        await sender
          .requestShareLocationEvent()
          .post.query(params('share-location', { client: sender }))
          .send(input)
          .expect(201)

        expect(postToConnection).toHaveBeenCalledExactlyOnceWith({
          ConnectionId: `${sender.auth.user.id}`,
          Data: expect.stringMatching(/약속을 찾을 수 없습니다/),
        })

        await clearHttpRequest(sender)
      })

      test('should receive error message if promiseIds is invalid', async () => {
        const user = await fixture.write.user.output()
        await fixture.write.promise({ host: user })
        const sender = await cloneHttpRequest('share-location', { user })

        const input = {
          event: 'share-location',
          data: {
            param: { promiseIds: ['INVALID_PROMISE_ID'] },
            body: { lat: 37.123456, lng: 127.123456 },
          },
        } satisfies ShareLocationEvent.Payload

        await sender
          .requestShareLocationEvent()
          .post.query(params('share-location', { client: sender }))
          .send(input)
          .expect(201)

        expect(postToConnection).toHaveBeenCalledExactlyOnceWith({
          ConnectionId: `${sender.auth.user.id}`,
          Data: expect.stringMatching(/약속을 찾을 수 없습니다/),
        })

        await clearHttpRequest(sender)
      })

      test('should receive error message if connection not found in attended promises', async () => {
        const user = await fixture.write.user.output()
        await fixture.write.promise({ host: user })
        const sender = await cloneHttpRequest('share-location', { user })

        const input = {
          event: 'share-location',
          data: {
            param: { promiseIds: [hasher.encode(0)] },
            body: { lat: 37.123456, lng: 127.123456 },
          },
        } satisfies ShareLocationEvent.Payload

        await sender
          .requestShareLocationEvent()
          .post.query(params('share-location', { client: sender }))
          .send(input)
          .expect(201)

        expect(postToConnection).toHaveBeenCalledExactlyOnceWith({
          ConnectionId: `${sender.auth.user.id}`,
          Data: expect.stringMatching(/연결된 약속을 찾을 수 없습니다/),
        })

        await clearHttpRequest(sender)
      })

      // eslint-disable-next-line jest/no-disabled-tests
      test.skip('should receive error message if failed to send message', async () => {
        const user = await fixture.write.user.output()
        await fixture.write.promise({ host: user })
        const sender = await cloneHttpRequest('share-location', { user })

        postToConnection.mockRejectedValueOnce({ name: 'GoneException' } as never)
        const disconnect = jest.spyOn(EventHandler, 'disconnect')

        const input = {
          event: 'share-location',
          data: {
            param: { promiseIds: [hasher.encode(0)] },
            body: { lat: 37.123456, lng: 127.123456 },
          },
        } satisfies ShareLocationEvent.Payload

        await sender
          .requestShareLocationEvent()
          .post.query(params('share-location', { client: sender }))
          .send(input)
          .expect(201)

        expect(disconnect).toHaveBeenCalledWith(`${sender.auth.user.id}`)
        disconnect.mockRestore()

        await clearHttpRequest(sender)
      })
    })
  })

  afterAll(async () => {
    await prisma.$disconnect()
    http.request.close()
  })
})
