import { Module } from '@nestjs/common';

import { WebSocketEventGateway } from './websocket.gateway';

@Module({
  imports: [WebSocketEventGateway],
})
export class EventModule {}
