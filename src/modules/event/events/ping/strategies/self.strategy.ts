import { PingEvent } from '../ping.dto';

import { Strategy } from './strategy';

import { ConnectionService } from '@/modules/event/connection';
import { TypedEventEmitter } from '@/utils';

export class SelfStrategy implements Strategy<PingEvent.Strategy.Self> {
  constructor(
    private readonly connection: ConnectionService,
    private readonly emitter: TypedEventEmitter<PingEvent.Type>
  ) {}

  async post<T>(id: string, data: PingEvent.Payload<PingEvent.Strategy.Self, T>['data']) {
    const response: PingEvent.Response = { from: id, timestamp: Date.now(), data: data.body };
    await this.emitter.emit('send', { id }, response);
  }
}
