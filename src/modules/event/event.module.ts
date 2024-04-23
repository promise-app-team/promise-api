import { Module } from '@nestjs/common';

import { EventController } from './event.controller';
import { EventGateway } from './event.gateway';
import { EventManager } from './events';

@Module({
  controllers: [EventController],
  providers: [EventGateway, EventManager],
})
export class EventModule {}
