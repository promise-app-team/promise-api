import { IncomingMessage } from 'http';

import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  SubscribeMessage,
} from '@nestjs/websockets';
import { v4 as uuid } from 'uuid';
import { WebSocket } from 'ws';

interface Client extends WebSocket {
  id: string;
  to: 'broadcast' | 'self' | string;
}

@WebSocketGateway()
export class EventGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(EventGateway.name);

  @WebSocketServer()
  server!: typeof WebSocketServer;

  clients: Client[] = [];

  afterInit(_server: typeof WebSocketServer) {
    this.logger.log('WebSocket server initialized');
  }

  handleConnection(client: Client, incoming: IncomingMessage) {
    const params = new URLSearchParams(incoming.url?.replace('/?', ''));
    client.id = uuid();
    client.to = params.get('to') || 'self';

    this.clients.push(client);
    this.logger.log(`Client connected: ${client['id']}`);
    this.logger.log(`Total clients: ${this.clients.length}`);
    client.send(`Successfully Connected! Client ID: ${client['id']}`);
  }

  handleDisconnect(client: Client) {
    this.clients = this.clients.filter((c) => c !== client);
    this.logger.log(`Client disconnected: ${client['id']}`);
    this.logger.log(`Total clients: ${this.clients.length}`);
  }

  @SubscribeMessage('ping')
  handlePing(client: Client, data: any) {
    if (client.to === 'broadcast') {
      const toClients = this.clients.filter((c) => c.id !== client.id);
      toClients.forEach((c) => c.send(this.#payload(client, data)));
    } else if (client.to === 'self') {
      client.send(this.#payload(client, data));
    } else if (client.to) {
      const toClient = this.clients.find((c) => c.id === client.to);
      if (toClient) {
        toClient.send(this.#payload(client, data));
      } else {
        client.send(this.#payload(client, `Client with ID ${client.to} not found`));
      }
    }
  }

  #payload(client: Client, data?: any) {
    return JSON.stringify({
      from: client.id,
      timestamp: Date.now(),
      data,
    });
  }
}
