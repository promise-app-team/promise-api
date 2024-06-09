import { getUnixTime } from 'date-fns';
import * as R from 'remeda';

import { Strategy } from './strategy';

import type { PingEvent } from '../ping.interface';
import type { ConnectionID } from '@/modules/event/connections';

export class BroadcastStrategy extends Strategy<PingEvent.Strategy.Broadcast> {
  async post<T>(cid: ConnectionID, data: PingEvent.Payload<PingEvent.Strategy.Broadcast, T>['data']) {
    const toConnections = await this.connection.getConnections('default');
    await Promise.all(
      R.pipe(
        toConnections,
        R.filter((to) => to.cid !== cid),
        R.map((to) =>
          this.emitter.emit('send', to.cid, {
            from: cid,
            timestamp: getUnixTime(Date.now()),
            data: data.body,
          })
        )
      )
    );
  }
}
