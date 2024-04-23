import { getUnixTime } from 'date-fns';
import * as R from 'remeda';

import { PingEvent } from '../ping.dto';

import { Strategy } from './strategy';

import { ConnectionID } from '@/modules/event/connections';

export class BroadcastStrategy extends Strategy<PingEvent.Strategy.Broadcast> {
  async post<T>(id: ConnectionID, data: PingEvent.Payload<PingEvent.Strategy.Broadcast, T>['data']) {
    const toConnections = await this.connection.getConnections();
    const response: PingEvent.Response = { from: id, timestamp: getUnixTime(Date.now()), data: data.body };
    await Promise.all(
      R.pipe(
        toConnections,
        R.filter((to) => to.id !== id),
        R.map((to) => this.emitter.emit('send', to.id, response))
      )
    );
  }
}
