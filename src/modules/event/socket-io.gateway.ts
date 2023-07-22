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
export class SocketIOEventGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(SocketIOEventGateway.name);
  private intervalIdById: Record<string, ReturnType<typeof setInterval>> = {};

  @WebSocketServer()
  io: Namespace;

  afterInit(_server: Socket) {
    this.logger.log('SocketIO Gateway Initialized');
  }

  handleConnection(client: Socket) {
    const sockets = this.io.sockets;
    this.logger.debug(`Client connected: ${client.id}`);
    this.logger.debug(`Total clients: ${sockets.size}`);

    const ms = +client.handshake.query['interval'] || null;
    const to = client.handshake.query['to'] || null;

    clearInterval(this.intervalIdById[client.id]);
    client.emit('pong', `Successfully Connected! Client ID: ${client.id}`);
    if (typeof ms === 'number') {
      this.intervalIdById[client.id] = setInterval(emitEvents.bind(this), ms);
    } else {
      emitEvents.call(this);
    }

    client.on('ping', (data) => {
      emitEvents.call(this, data);
    });

    function emitEvents(data: any) {
      const payload = JSON.stringify({
        from: client.id,
        timestamp: Date.now(),
        data,
      });
      if (to === 'broadcast') {
        this.io.emit('pong', payload);
      } else if (to === 'self') {
        client.emit('pong', payload);
      } else if (to) {
        this.io.to(to).emit('pong', payload);
      }
    }
  }

  handleDisconnect(client: Socket) {
    const sockets = this.io.sockets;

    this.logger.debug(`Client disconnected: ${client.id}`);
    this.logger.debug(`Total clients: ${sockets.size}`);

    clearInterval(this.intervalIdById[client.id]);
  }
}
