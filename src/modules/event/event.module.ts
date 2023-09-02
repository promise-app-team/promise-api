import { Module } from '@nestjs/common';
import { WebSocketEventGateway } from './websocket.gateway';

@Module({
  imports: [
    // SocketIOEventGateway,
    WebSocketEventGateway,
  ],
})
export class EventModule {}
