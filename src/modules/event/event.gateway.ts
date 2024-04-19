import { IncomingMessage } from 'http';

import { Logger } from '@nestjs/common';
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

type Client = WebSocket & Pick<Connection, 'id'>;

@WebSocketGateway()
export class EventGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly clients: Map<string, Client> = new Map();
  private readonly logger = new Logger(EventGateway.name);

  constructor(private readonly event: EventManager) {}

  async handleConnection(@ConnectedSocket() client: Client, _incoming: IncomingMessage) {
    client.id = uuid();
    this.clients.set(client.id, client);
    await this.event.get('connect').handle(client.id);
    const connections = await this.event.connection.getConnections();
    this.logger.log(`[CONNECT] Client connected: ${client.id} (total: ${connections.length})`);
  }

  async handleDisconnect(@ConnectedSocket() client: Client) {
    this.clients.delete(client.id);
    await this.event.get('disconnect').handle(client.id);
    const connections = await this.event.connection.getConnections();
    this.logger.log(`[DISCONNECT] Client disconnected: ${client.id} (total: ${connections.length})`);
  }

  @SubscribeMessage('ping')
  async handlePing(client: Client, data: any) {
    const handler = this.event.get('ping');
    handler.on('send', async (connection, data) => {
      const client = this.clients.get(connection.id);
      client?.send(JSON.stringify(data));
    });
    await handler.handle(client.id, data);
    this.logger.log(`[MESSAGE] Client sent message: ${client.id} with ${JSON.stringify(data)}`);
  }
}
