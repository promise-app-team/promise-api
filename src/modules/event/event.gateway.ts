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

import { Connection } from './connection';
import { EventManager } from './events';

import { LoggerService } from '@/customs/logger';
import { random } from '@/utils';

type Client = WebSocket & Pick<Connection, 'id'>;

@WebSocketGateway()
export class EventGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly clients: Map<string, Client> = new Map();

  constructor(
    private readonly event: EventManager,
    private readonly logger: LoggerService
  ) {
    logger.setContext(EventGateway.name);
  }

  async handleConnection(@ConnectedSocket() client: Client, _incoming: IncomingMessage) {
    client.id = uuid();
    this.clients.set(client.id, client);
    const response = await this.event.get('connect').handle(client.id);
    const connections = await this.event.connection.getConnections();
    this.logger.debug(`Client connected: ${client.id} (total: ${connections.length})`);
    return response;
  }

  async handleDisconnect(@ConnectedSocket() client: Client) {
    this.clients.delete(client.id);
    const response = await this.event.get('disconnect').handle(client.id);
    const connections = await this.event.connection.getConnections();
    this.logger.debug(`Client disconnected: ${client.id} (total: ${connections.length})`);
    return response;
  }

  @SubscribeMessage('ping')
  async handlePingEvent(client: Client, data: any) {
    const handler = this.event.get('ping');
    handler.on('send', async (connection, data) => {
      await new Promise((resolve) => setTimeout(resolve, random(1000, 5000)));
      this.clients.get(connection.id)?.send(JSON.stringify(data));
    });
    const response = await handler.handle(client.id, data);
    this.logger.debug(`Client sent message: ${client.id} with ${JSON.stringify(data)}`);
    return response;
  }
}
