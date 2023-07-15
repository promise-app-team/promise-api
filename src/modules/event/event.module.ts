import { Module } from '@nestjs/common';
import { EventGateway } from './event.gateway';

@Module({
  imports: [EventGateway],
})
export class EventModule {}
