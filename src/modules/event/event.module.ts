import { Module } from '@nestjs/common';

import { UserService } from '../user';

import { EventController } from './event.controller';
import { EventGateway } from './event.gateway';
import { EventService } from './event.service';
import { EventManager } from './events';

@Module({
  controllers: [EventController],
  providers: [EventGateway, EventService, EventManager, UserService],
})
export class EventModule {}
