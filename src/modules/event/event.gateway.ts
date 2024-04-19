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

import { Connection, ConnectionTo } from './event.dto';
import { EventService } from './event.service';

import { TypedConfigService } from '@/config/env';

type Client = WebSocket & Connection;

@WebSocketGateway()
export class EventGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly clients = new Map<string, Client>();
  private readonly logger = new Logger(EventGateway.name);

  constructor(
    private readonly config: TypedConfigService,
    private readonly eventService: EventService
  ) {
    if (!this.config.get('is.local')) return;

    this.eventService.on('send', async (connection, data) => {
      const client = this.clients.get(connection.id);
      client?.send(JSON.stringify(data));
    });
  }

  async handleConnection(@ConnectedSocket() client: Client, incoming: IncomingMessage) {
    const params = new URLSearchParams(incoming.url?.replace('/?', ''));
    client.id = uuid();
    client.to = params.get('to') || ConnectionTo.Self;

    this.clients.set(client.id, client);
    await this.eventService.handleConnection(client.id, { to: client.to });
    this.logger.log(`[CONNECT] Client connected: ${client.id} (total: ${this.clients.size})`);
  }

  async handleDisconnect(@ConnectedSocket() client: Client) {
    this.clients.delete(client.id);
    await this.eventService.handleDisconnect(client.id);
    this.logger.log(`[DISCONNECT] Client disconnected: ${client.id} (total: ${this.clients.size})`);
  }

  @SubscribeMessage('ping')
  async handlePing(client: Client, data: any) {
    await this.eventService.handlePing(client.id, data);
    this.logger.log(`[MESSAGE] Client sent message: ${client.id} with ${JSON.stringify(data, null, 2)}`);
  }
}
