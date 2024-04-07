import { Module } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { EventController } from './event.controller';
import { EventGateway } from './event.gateway';

@ApiTags('Event')
@Module({
  controllers: [EventController],
  providers: [EventGateway],
})
export class EventModule {}
