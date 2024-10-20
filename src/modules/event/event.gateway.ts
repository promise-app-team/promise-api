import { IncomingMessage } from 'http'

import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WsException,
} from '@nestjs/websockets'
import { v4 as uuid } from 'uuid'
import { WebSocket } from 'ws'

import { TypedConfigService } from '@/config/env'
import { LoggerService } from '@/customs/logger'
import { random } from '@/utils'

import { JwtAuthTokenService } from '../auth'

import { Connection, ConnectionID } from './connections'
import { EventService } from './event.service'
import { Events } from './events'
import { PingEvent } from './events/ping'
import { ShareLocationEvent } from './events/share-location'

type Client = WebSocket & Pick<Connection, 'cid' | 'uid'>

@WebSocketGateway()
export class EventGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly clients: Map<ConnectionID, Client> = new Map()

  constructor(
    private readonly service: EventService,
    private readonly jwt: JwtAuthTokenService,
    private readonly logger: LoggerService,
    private readonly config: TypedConfigService,
  ) {
    logger.setContext(EventGateway.name)
  }

  async handleConnection(@ConnectedSocket() client: Client, incoming: IncomingMessage) {
    try {
      const authToken = this.getAuthToken(incoming)
      const payload = authToken ? this.jwt.verifyAccessToken(authToken) : null
      if (!payload) throw new Error('Invalid auth token')

      Object.assign(client, { cid: uuid(), uid: payload.sub })
      this.clients.set(client.cid, client)

      const params = new URLSearchParams(incoming.url?.replace('/?', ''))
      const event = params.get('event') as keyof Events
      const channel = params.get('channel') || undefined
      return await this.service.handleConnection(event, { ...client, channel })
    }
    catch (error: any) {
      client.close()
      this.logger.warn(`Client connection failed: ${error.message} (${error.name})`)
    }
  }

  async handleDisconnect(@ConnectedSocket() client: Client) {
    try {
      if (!client.cid) return { message: 'Invalid client' }
      this.clients.delete(client.cid)
      return await this.service.handleDisconnection(client.cid)
    }
    catch (error: any) {
      this.logger.warn(`Client disconnection failed: ${error.message} (${error.name})`)
    }
  }

  @SubscribeMessage('ping')
  handlePingEvent(client: Client, data: PingEvent.Data) {
    if (this.config.get('is.prod')) throw new WsException('Forbidden')

    return this.service.handlePingEvent(
      client.cid,
      data,
      async (cid, data) => {
        await new Promise(resolve => setTimeout(resolve, random(100, 1000)))
        this.clients.get(cid)?.send(JSON.stringify(data))
      },
      async (error) => {
        await new Promise(resolve => setTimeout(resolve, random(100, 1000)))
        this.clients.get(client.cid)?.send(JSON.stringify(error))
      },
    )
  }

  @SubscribeMessage('share-location')
  async handleShareLocationEvent(client: Client, data: ShareLocationEvent.Data) {
    if (this.config.get('is.prod')) throw new WsException('Forbidden')

    return this.service.handleShareLocationEvent(
      client.cid,
      data,
      async (cid, data) => {
        await new Promise(resolve => setTimeout(resolve, random(100, 1000)))
        this.clients.get(cid)?.send(JSON.stringify(data))
      },
      async (error) => {
        await new Promise(resolve => setTimeout(resolve, random(100, 1000)))
        this.clients.get(client.cid)?.send(JSON.stringify(error))
      },
    )
  }

  private getAuthToken(incoming: IncomingMessage): string | null {
    const [type, token] = incoming.headers.authorization?.split(' ') ?? []
    return type?.toLowerCase() === 'bearer' ? token : null
  }
}
