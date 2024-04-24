import { getUnixTime } from 'date-fns';

import { PingEvent } from '../ping.interface';

import { Strategy } from './strategy';

import { ConnectionID } from '@/modules/event/connections';

export class SelfStrategy extends Strategy<PingEvent.Strategy.Self> {
  async post<T>(cid: ConnectionID, data: PingEvent.Payload<PingEvent.Strategy.Self, T>['data']) {
    await this.emitter.emit('send', cid, {
      from: cid,
      timestamp: getUnixTime(Date.now()),
      data: data.body,
    });
  }
}
