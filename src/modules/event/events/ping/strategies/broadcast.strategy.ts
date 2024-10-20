import { getUnixTime } from 'date-fns'

import { Strategy } from './strategy'

import type { PingEvent } from '../ping.interface'
import type { ConnectionID } from '@/modules/event/connections'

export class BroadcastStrategy extends Strategy<PingEvent.Strategy.Broadcast> {
  async post<T>(cid: ConnectionID, data: PingEvent.Payload<PingEvent.Strategy.Broadcast, T>['data']) {
    const channel = data.param?.channel || 'public'
    const toConnections = await this.connection.getConnections(channel)
    await Promise.all(
      toConnections
        .filter(to => to.cid !== cid)
        .map(to =>
          this.emitter.emit('send', to.cid, {
            from: cid,
            timestamp: getUnixTime(Date.now()),
            data: data.body,
          }),
        ),
    )
  }
}
