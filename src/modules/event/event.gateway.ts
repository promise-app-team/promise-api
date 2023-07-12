import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Namespace, Socket } from 'socket.io';

@WebSocketGateway({ namespace: 'ping' })
export class EventGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(EventGateway.name);
  private intervalIdById: Record<string, ReturnType<typeof setInterval>> = {};

  @WebSocketServer()
  io: Namespace;

  afterInit(_server: Socket) {
    this.logger.log('WebSocket Gateway Initialized');
  }

  handleConnection(client: Socket) {
    const sockets = this.io.sockets;
    this.logger.debug(`Client connected: ${client.id}`);
    this.logger.debug(`Total clients: ${sockets.size}`);

    const ms = +client.handshake.query['interval'] || 1000;
    const to = client.handshake.query['to'] || null;

    clearInterval(this.intervalIdById[client.id]);
    client.emit('pong', `Successfully Connected! Client ID: ${client.id}`);
    this.intervalIdById[client.id] = setInterval(() => {
      const payload = `Connected Clients: ${sockets.size} from ${client.id}`;
      if (to === 'broadcast') {
        this.io.emit('pong', payload);
      } else if (to === 'null') {
        // do nothing
      } else if (to) {
        this.io.to(to).emit('pong', payload);
      } else {
        client.emit('pong', payload);
      }
    }, ms);
  }

  handleDisconnect(client: Socket) {
    const sockets = this.io.sockets;

    this.logger.debug(`Client disconnected: ${client.id}`);
    this.logger.debug(`Total clients: ${sockets.size}`);

    clearInterval(this.intervalIdById[client.id]);
  }
}
