import { uid } from '@/utils/math/random';
import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  SubscribeMessage,
} from '@nestjs/websockets';
import { IncomingMessage } from 'http';
import { Server, WebSocket } from 'ws';

@WebSocketGateway()
export class WebSocketEventGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(WebSocketEventGateway.name);

  @WebSocketServer()
  server: Server;

  clients: WebSocket[] = [];

  afterInit(_server: Server) {
    this.logger.log('WebSocket Gateway Initialized');
  }

  @SubscribeMessage('ping')
  handlePing(client: WebSocket, data: any) {
    if (client['to'] === 'broadcast') {
      this.clients.forEach((c) => c.send(this.payload(c, data)));
    } else if (client['to'] === 'self') {
      client.send(this.payload(client, data));
    } else if (client['to']) {
      this.clients
        .filter((c) => c['id'] === client['to'])
        .forEach((c) => c.send(this.payload(c, data)));
    }
  }

  handleConnection(client: WebSocket, incoming: IncomingMessage) {
    const params = new URLSearchParams(incoming.url.replace('/?', ''));
    client['id'] = uid(16).toUpperCase();
    client['to'] = params.get('to') || null;

    this.clients.push(client);
    this.logger.debug(`Client connected: ${client['id']}`);
    this.logger.debug(`Total clients: ${this.clients.length}`);
    client.send(`Successfully Connected! Client ID: ${client['id']}`);
  }

  handleDisconnect(client: WebSocket) {
    this.clients = this.clients.filter((c) => c !== client);
    this.logger.debug(`Client disconnected: ${client['id']}`);
    this.logger.debug(`Total clients: ${this.clients.length}`);
  }

  payload(client: WebSocket, data?: any) {
    return JSON.stringify({
      from: client['id'],
      timestamp: Date.now(),
      data,
    });
  }
}
