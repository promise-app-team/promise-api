import { Module } from '@nestjs/common';

import { ConnectionService } from './connection.service';
import { EventController } from './event.controller';
import { EventGateway } from './event.gateway';
import { EventService } from './event.service';

@Module({
  controllers: [EventController],
  providers: [EventGateway, EventService, ConnectionService],
})
export class EventModule {}
