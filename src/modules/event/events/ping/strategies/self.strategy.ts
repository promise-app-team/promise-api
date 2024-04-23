import { getUnixTime } from 'date-fns';

import { PingEvent } from '../ping.dto';

import { Strategy } from './strategy';

import { ConnectionID } from '@/modules/event/connections';

export class SelfStrategy extends Strategy<PingEvent.Strategy.Self> {
  async post<T>(id: ConnectionID, data: PingEvent.Payload<PingEvent.Strategy.Self, T>['data']) {
    const response: PingEvent.Response = { from: id, timestamp: getUnixTime(Date.now()), data: data.body };
    await this.emitter.emit('send', id, response);
  }
}
