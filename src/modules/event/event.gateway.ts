import { IncomingMessage } from 'http';

import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
} from '@nestjs/websockets';
import { v4 as uuid } from 'uuid';
import { WebSocket } from 'ws';

import { JwtAuthTokenService } from '../auth';

import { Connection } from './connections';
import { EventHandler, EventManager, Events } from './events';
import { PingEvent } from './events/ping';
import { ShareLocationEvent } from './events/share-location';

import { LoggerService } from '@/customs/logger';
import { random } from '@/utils';

type Client = WebSocket & Pick<Connection, 'id'>;

@WebSocketGateway()
export class EventGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly clients: Map<string, Client> = new Map();

  constructor(
    private readonly event: EventManager,
    private readonly jwt: JwtAuthTokenService,
    private readonly logger: LoggerService
  ) {
    logger.setContext(EventGateway.name);
  }

  async handleConnection(@ConnectedSocket() client: Client, incoming: IncomingMessage) {
    try {
      const authToken = this.getAuthToken(incoming);
      const payload = authToken ? this.jwt.verifyToken(authToken) : null;
      console.log(payload);
      const params = new URLSearchParams(incoming.url?.replace('/?', ''));
      client.id = uuid();
      this.clients.set(client.id, client);

      const name = params.get('event') as keyof Events;
      const response = await this.event.get(name).connect(client.id);
      this.logger.debug(`Client connected: ${client.id} (total: ${this.clients.size})`);
      return response;
    } catch (error: any) {
      this.logger.error(`Failed to connect client: ${client.id}`, error);
      client.close();
    }
  }

  async handleDisconnect(@ConnectedSocket() client: Client) {
    this.clients.delete(client.id);
    this.logger.debug(`Client disconnected: ${client.id} (total: ${this.clients.size})`);
    await EventHandler.disconnect(client.id);
    return { message: `Disconnected from ${client.id}` };
  }

  @SubscribeMessage('ping')
  async handlePingEvent(client: Client, data: PingEvent.Data) {
    const handler = this.event.get('ping');

    handler.on('send', async (id, data) => {
      await new Promise((resolve) => setTimeout(resolve, random(100, 1000)));
      this.clients.get(id)?.send(JSON.stringify(data));
    });

    const response = await handler.handle(client.id, data);
    this.logger.debug(`Client sent message: ${client.id} with ${JSON.stringify(data)}`);
    return response;
  }

  @SubscribeMessage('share-location')
  async handleShareLocationEvent(client: Client, data: ShareLocationEvent.Data) {
    const handler = this.event.get('share-location');

    handler.on('share', async (id, data) => {
      await new Promise((resolve) => setTimeout(resolve, random(100, 1000)));
      this.clients.get(id)?.send(JSON.stringify(data));
    });

    const response = await handler.handle(client.id, data);

    this.logger.debug(`Client sent message: ${client.id} with ${JSON.stringify(data)}`);

    return response;
  }

  private getAuthToken(incoming: IncomingMessage): string | null {
    const [type, token] = incoming.headers.authorization?.split(' ') ?? [];
    return type?.toLowerCase() === 'bearer' ? token : null;
  }
}
