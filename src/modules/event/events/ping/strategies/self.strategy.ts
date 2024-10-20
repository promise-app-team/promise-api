import { getUnixTime } from 'date-fns'

import { Strategy } from './strategy'

import type { PingEvent } from '../ping.interface'
import type { ConnectionID } from '@/modules/event/connections'

export class SelfStrategy extends Strategy<PingEvent.Strategy.Self> {
  async post<T>(cid: ConnectionID, data: PingEvent.Payload<PingEvent.Strategy.Self, T>['data']) {
    const response = (data: PingEvent.Payload<PingEvent.Strategy.Self>['data']['body']) =>
      ({ from: cid, timestamp: getUnixTime(Date.now()), data }) satisfies PingEvent.Message

    const channel = data.param?.channel || 'public'
    const connection = await this.connection.getConnection(cid, channel)
    if (connection) {
      await this.emitter.emit('send', connection.cid, response(data.body))
    }
    else {
      const error = `Connection '${cid}' not found in '${channel}'`
      await this.emitter.emit('send', cid, response({ error }))
    }
  }
}
