import { Module } from '@nestjs/common';

import { WebSocketEventGateway } from '@/modules/event/websocket.gateway';

@Module({
  imports: [WebSocketEventGateway],
})
export class EventModule {}
