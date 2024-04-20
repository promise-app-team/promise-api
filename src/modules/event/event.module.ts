import { Module } from '@nestjs/common';

import { ConnectionService } from './connection';
import { EventController } from './event.controller';
import { EventGateway } from './event.gateway';
import { EventManager } from './events';

@Module({
  controllers: [EventController],
  providers: [EventGateway, EventManager, ConnectionService],
})
export class EventModule {}
