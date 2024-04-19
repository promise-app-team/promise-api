import { PingEvent } from '../ping.dto';

import { Strategy } from './strategy';

import { ConnectionService } from '@/modules/event/connection';
import { TypedEventEmitter } from '@/utils';

export class CommonStrategy implements Strategy<never> {
  constructor(
    private readonly connection: ConnectionService,
    private readonly emitter: TypedEventEmitter<PingEvent.Type>
  ) {}

  async post<T>(id: string, data: PingEvent.Payload<never, T>['data']) {
    const response: PingEvent.Response = { from: id, timestamp: Date.now(), data: data.body };
    this.emitter.emit('send', { id }, response);
  }
}
