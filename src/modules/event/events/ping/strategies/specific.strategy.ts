import { PingEvent } from '../ping.dto';

import { Strategy } from './strategy';

import { ConnectionService } from '@/modules/event/connection';
import { TypedEventEmitter } from '@/utils';

export class SpecificStrategy implements Strategy<PingEvent.Strategy.Specific> {
  constructor(
    private readonly connection: ConnectionService,
    private readonly emitter: TypedEventEmitter<PingEvent.Type>
  ) {}

  async post<T>(id: string, data: PingEvent.Payload<PingEvent.Strategy.Specific, T>['data']) {
    const response = (data: any) => ({ from: id, timestamp: Date.now(), data: data.body }) satisfies PingEvent.Response;

    if (!data.param?.to) {
      const error = `Strategy 'specific' requires a 'to' parameter`;
      return this.emitter.emit('send', { id }, response({ body: { error } }));
    }

    const to = await this.connection.getConnection(data.param.to);
    if (to) {
      this.emitter.emit('send', to, response(data));
    } else {
      const error = `Connection '${data.param.to}' not found`;
      this.emitter.emit('send', { id }, response({ body: { error } }));
    }
  }
}
