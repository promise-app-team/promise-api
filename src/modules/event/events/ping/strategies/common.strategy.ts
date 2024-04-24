import { getUnixTime } from 'date-fns';

import { PingEvent } from '../ping.interface';

import { Strategy } from './strategy';

import { ConnectionID } from '@/modules/event/connections';

export class CommonStrategy extends Strategy<never> {
  async post<T>(cid: ConnectionID, data: PingEvent.Payload<never, T>['data']) {
    this.emitter.emit('send', cid, {
      from: cid,
      timestamp: getUnixTime(Date.now()),
      data: data.body,
    });
  }
}
