import { Module } from '@nestjs/common';

import { UserService } from '../user';

import { EventController } from './event.controller';
import { EventGateway } from './event.gateway';
import { EventManager } from './events';

@Module({
  controllers: [EventController],
  providers: [EventGateway, EventManager, UserService],
})
export class EventModule {}
