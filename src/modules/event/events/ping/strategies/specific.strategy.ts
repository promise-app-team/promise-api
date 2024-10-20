import { getUnixTime } from 'date-fns'

import { Strategy } from './strategy'

import type { PingEvent } from '../ping.interface'
import type { ConnectionID } from '@/modules/event/connections'

export class SpecificStrategy extends Strategy<PingEvent.Strategy.Specific> {
  async post<T>(cid: ConnectionID, data: PingEvent.Payload<PingEvent.Strategy.Specific, T>['data']) {
    const response = (data: PingEvent.Payload<PingEvent.Strategy.Specific>['data']['body']) =>
      ({ from: cid, timestamp: getUnixTime(Date.now()), data }) satisfies PingEvent.Message

    if (!data.param?.to) {
      const error = `Strategy 'specific' requires a 'to' parameter`
      return this.emitter.emit('send', cid, response({ error }))
    }

    const channel = data.param?.channel || 'public'
    const connection = await this.connection.getConnection(data.param.to, channel)
    if (connection) {
      await this.emitter.emit('send', connection.cid, response(data.body))
    }
    else {
      const error = `Connection '${data.param.to}' not found in '${channel}'`
      await this.emitter.emit('send', cid, response({ error }))
    }
  }
}
