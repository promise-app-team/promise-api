import * as R from 'remeda';

import { PingEvent } from '../ping.dto';

import { Strategy } from './strategy';

import { ConnectionService } from '@/modules/event/connection';
import { TypedEventEmitter } from '@/utils';

export class BroadcastStrategy implements Strategy<PingEvent.Strategy.Broadcast> {
  constructor(
    private readonly connection: ConnectionService,
    private readonly emitter: TypedEventEmitter<PingEvent.Type>
  ) {}

  async post<T>(id: string, data: PingEvent.Payload<PingEvent.Strategy.Broadcast, T>['data']) {
    const toConnections = await this.connection.getConnections();
    const response: PingEvent.Response = { from: id, timestamp: Date.now(), data: data.body };
    await Promise.all(
      R.pipe(
        toConnections,
        R.filter((to) => to.id !== id),
        R.map((to) => this.emitter.emit('send', to, response))
      )
    );
  }
}
